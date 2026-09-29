using System.Globalization;
using System.Text.RegularExpressions;
using VietAnExpress.Shipments.Domain;
using VietAnExpress.Shipments.Infrastructure.Legacy;

namespace VietAnExpress.Shipments.Application.Orders;

/// <summary>Khách sở hữu đơn, theo mã của hệ thống cũ (dbo.TCustomer).</summary>
internal sealed record LegacyCustomerRef(long LegacyCustomerId, string CompanyName, string? ContactName, string? Phone, string? Email);

/// <summary>
/// Dựng 1 dòng dbo.MaVanDon từ đơn tạo trên portal. Hàm thuần — có test.
/// Quy ước ghi theo dữ liệu hệ thống cũ đang có: Service = 1, Status = 1 (đơn mới), Dich_Vu dạng "DHL|Singapore",
/// ngày tạo là ngày (giờ Việt Nam). Chuỗi được cắt theo độ dài cột để không lỗi khi ghi.
/// </summary>
internal static partial class LegacyOrderFactory
{
    private const int NewService = 1;
    private const int NewStatus = 1;

    public static LegacyOrder FromPayload(OrderPayload p, LegacyCustomerRef customer, long orderNumber, DateTime todayVn)
    {
        var isDoc = string.Equals(p.Shipment.Type, "DOC", StringComparison.OrdinalIgnoreCase);
        var pieces = Math.Max(1, (int)Num(p.Shipment.Pieces));
        var weight = isDoc ? Num(p.Shipment.GrossWeight) : ChargeableWeight(p.Packages, Num(p.Shipment.GrossWeight));
        var goods = isDoc ? p.Goods.DocContent : p.Goods.Description;
        var value = p.Invoice.Items.Sum(i => Num(i.Qty) * Num(i.Price));

        return new LegacyOrder
        {
            CustomerId = customer.LegacyCustomerId,
            CustomerName = Clip(customer.CompanyName, 250),
            OrderNumber = orderNumber,
            Awb = "",

            SenderName = Clip(p.Shipper.Company, 250),
            SenderAddress = Clip(p.Shipper.Address, 500),
            SenderContactName = Clip(p.Shipper.Contact, 100),
            SenderPhone = Clip(p.Shipper.Tel, 50),
            SenderEmail = Clip(p.Shipper.Email, 150),
            SenderTax = Clip(p.Shipper.TaxId, 100),

            ConsigneeName = Clip(p.Receiver.Company, 250),
            ConsigneeContactName = Clip(p.Receiver.Contact, 100),
            ConsigneePhone = Clip(p.Receiver.Tel, 50),
            ConsigneeEmail = Clip(p.Receiver.Email, 150) ?? "",
            ConsigneeAddress1 = Clip(p.Receiver.Addr1, 250),
            ConsigneeAddress2 = Clip(p.Receiver.Addr2, 250),
            ConsigneeAddress3 = Clip(p.Receiver.Addr3, 250),
            ConsigneeCity = Clip(p.Receiver.City, 50),
            ConsigneeState = Clip(p.Receiver.State, 50),
            ConsigneePostalCode = Clip(p.Receiver.Postal, 50),
            ConsigneeCountry = Clip(p.Receiver.Country, 50),
            ConsigneeVatTax = Clip(p.Receiver.TaxId, 100),
            // Hệ thống cũ lưu mã điện thoại chỉ gồm chữ số, vd "65", "1".
            ConsigneePhoneCode = Clip(new string(p.Receiver.PhoneCode.Where(char.IsAsciiDigit).ToArray()), 50),

            ServiceName = Clip(ServiceName(p.Service.Hub, p.Service.Carrier), 50),
            GoodsName = Clip(string.IsNullOrWhiteSpace(goods) ? (isDoc ? "DOCUMENTS" : "GOODS") : goods, 150),
            Pieces = pieces,
            WeightKg = Round(weight),
            GoodsValue = Round(value),
            Currency = Clip(string.IsNullOrWhiteSpace(p.Invoice.Currency) ? "USD" : p.Invoice.Currency, 50),
            ShippingFee = Num(p.Invoice.ShippingFee),
            ExportReason = Clip(p.Invoice.ExportType, 150),
            CustomerBill = Clip(p.Service.Reference, 50),

            Service = NewService,
            Status = NewStatus,
            CreateDate = todayVn.Date,
            ModifyDate = todayVn.Date,
            CreateUser = 0,
            ModifyUser = 0,
            CustomerStaffId = 0
        };
    }

    public static LegacyOrder FromBatchRow(BatchOrderRow row, LegacyCustomerRef customer, long orderNumber, DateTime todayVn)
    {
        var (pieces, weight) = ParsePieces(row.Pcs);
        return new LegacyOrder
        {
            CustomerId = customer.LegacyCustomerId,
            CustomerName = Clip(customer.CompanyName, 250),
            OrderNumber = orderNumber,
            Awb = "",
            SenderName = Clip(customer.CompanyName, 250),
            SenderContactName = Clip(customer.ContactName, 100),
            SenderPhone = Clip(customer.Phone, 50),
            SenderEmail = Clip(customer.Email, 150),

            ConsigneeName = Clip(Coalesce(row.Receiver.Company, row.Cnee), 250),
            ConsigneeContactName = Clip(row.Receiver.Contact, 100),
            ConsigneePhone = Clip(row.Receiver.Tel, 50),
            ConsigneeEmail = "",
            ConsigneeAddress1 = Clip(row.Receiver.Addr1, 250),
            ConsigneeAddress2 = Clip(row.Receiver.Addr2, 250),
            ConsigneeCity = Clip(row.Receiver.City, 50),
            ConsigneePostalCode = Clip(row.Receiver.Postal, 50),
            ConsigneeCountry = Clip(Coalesce(row.Receiver.Country, row.Ct), 50),

            ServiceName = Clip(ServiceName(row.Hub, row.Service), 50),
            GoodsName = Clip(Coalesce(row.Content, "GOODS"), 150),
            Pieces = pieces,
            WeightKg = Round(weight),
            GoodsValue = row.DeclaredValue is { } v ? Round(v) : null,
            Currency = "USD",
            CustomerBill = Clip(row.Ref, 50),

            Service = NewService,
            Status = NewStatus,
            CreateDate = todayVn.Date,
            ModifyDate = todayVn.Date,
            CreateUser = 0,
            ModifyUser = 0,
            CustomerStaffId = 0
        };
    }

    /// <summary>"DHL - Singapore" → "DHL|Singapore" (định dạng cột Dich_Vu của hệ thống cũ).</summary>
    public static string ServiceName(string hub, string carrier)
    {
        var source = string.IsNullOrWhiteSpace(hub) ? carrier : hub;
        var parts = source.Split(" - ", 2, StringSplitOptions.TrimEntries);
        return parts.Length == 2 ? $"{parts[0]}|{parts[1]}" : source.Trim();
    }

    /// <summary>Cân tính cước = max(tổng cân thực, tổng cân quy đổi D×R×C/5000) — giống frontend; không có kiện thì lấy cân tổng khai báo.</summary>
    public static decimal ChargeableWeight(IReadOnlyCollection<OrderPayload.PackagePart> packages, decimal grossWeight)
    {
        if (packages.Count == 0) return grossWeight;
        var actual = packages.Sum(p => Num(p.Weight) * Math.Max(1, Num(p.Qty)));
        var volumetric = packages.Sum(p => Num(p.Length) * Num(p.Width) * Num(p.Height) * Math.Max(1, Num(p.Qty)) / ShippingRules.VolumetricDivisor);
        var chargeable = Math.Max(actual, volumetric);
        return chargeable > 0 ? chargeable : grossWeight;
    }

    [GeneratedRegex(@"(\d+)\s*kiện.*?([\d.,]+)\s*kg", RegexOptions.IgnoreCase)]
    private static partial Regex PiecesPattern();

    /// <summary>"3 kiện · 12.5 kg" → (3, 12.5).</summary>
    public static (int Pieces, decimal WeightKg) ParsePieces(string text)
    {
        var m = PiecesPattern().Match(text ?? "");
        return m.Success ? (int.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture), Num(m.Groups[2].Value.Replace(',', '.'))) : (1, 0);
    }

    private static decimal Num(string? value) =>
        decimal.TryParse(value?.Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out var n) && n > 0 ? n : 0;

    private static decimal Round(decimal value) => decimal.Round(value, 2, MidpointRounding.AwayFromZero);

    private static string Coalesce(string? first, string fallback) => string.IsNullOrWhiteSpace(first) ? fallback : first;

    private static string? Clip(string? value, int max)
    {
        var v = value?.Trim();
        return string.IsNullOrEmpty(v) ? null : v.Length <= max ? v : v[..max];
    }
}
