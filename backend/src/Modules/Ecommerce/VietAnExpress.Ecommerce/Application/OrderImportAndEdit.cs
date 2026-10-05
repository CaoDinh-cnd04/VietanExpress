using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.Ecommerce.Contracts;
using VietAnExpress.Ecommerce.Domain;
using VietAnExpress.Ecommerce.Infrastructure;
using VietAnExpress.Ecommerce.Infrastructure.Shopify;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Ecommerce.Application;

/// <summary>Nội dung file CSV khách tải lên (hiện nhận file "Export orders" của Shopify).</summary>
internal sealed record ImportOrdersCsvCommand(string? Csv) : IRequest<Result<CsvImportResult>>;

/// <summary>Khớp <c>CsvImportResult</c> của frontend — trả thẳng (không bọc trong data).</summary>
internal sealed record CsvImportResult(string Message, int ImportedCount, IReadOnlyList<CsvRowError> Errors);
internal sealed record CsvRowError(int Row, string Message);

internal sealed record EcomReceiverInput(
    string? Name, string? Company, string? Phone, string? Email, string? Address1, string? Address2,
    string? City, string? State, string? Postal, string? CountryCode);

/// <summary>Khớp <c>EcomOrderUpdate</c> của frontend.</summary>
internal sealed record EcomOrderEditInput(
    EcomReceiverInput? Receiver, decimal? Kg, IReadOnlyList<ManualProductInput>? Products,
    string? Service, string? Hub, string? Branch, string? Note);

internal sealed record UpdateEcomOrderCommand(long Id, EcomOrderEditInput Input) : IRequest<Result<EcomOrderDto>>;

/// <summary>Kiểm tra dữ liệu khách sửa. Hàm thuần — có test.</summary>
internal static class OrderEditRules
{
    public const int MaxProducts = 50;

    public static Result<(MarketplaceRecipient Recipient, List<EcomProductDto> Products, decimal? WeightKg)> Build(EcomOrderEditInput i)
    {
        var r = i.Receiver;
        if (string.IsNullOrWhiteSpace(r?.Name)) return Invalid("Nhập tên người nhận");
        if (string.IsNullOrWhiteSpace(r.Address1)) return Invalid("Nhập địa chỉ người nhận");
        var cc = r.CountryCode?.Trim().ToUpperInvariant();
        if (cc is not { Length: 2 } || !cc.All(char.IsAsciiLetter)) return Invalid("Chọn nước đến");
        if (i.Kg is < 0 or > 10000) return Invalid("Cân nặng không hợp lệ");

        var products = (i.Products ?? []).ToList();
        if (products.Count is 0 or > MaxProducts) return Invalid($"Đơn có từ 1 đến {MaxProducts} sản phẩm");
        if (products.Any(p => string.IsNullOrWhiteSpace(p.Name))) return Invalid("Nhập tên hàng cho mọi sản phẩm");
        if (products.Any(p => p.Qty < 1 || p.FobPrice < 0 || p.SellingPrice < 0)) return Invalid("Số lượng ≥ 1, giá không được âm");
        if (products.Any(p => !string.IsNullOrWhiteSpace(p.HsCode) && !IsHsCode(p.HsCode))) return Invalid("Mã HS gồm 6–10 chữ số");

        var recipient = new MarketplaceRecipient(
            Cut(r.Name, MarketplaceOrder.NameMaxLength), Cut(r.Company, MarketplaceOrder.NameMaxLength),
            Cut(OrderData.NormalizePhone(r.Phone, cc), MarketplaceOrder.PhoneMaxLength), Cut(r.Email, MarketplaceOrder.EmailMaxLength),
            Cut(r.Address1, MarketplaceOrder.AddressMaxLength), Cut(r.Address2, MarketplaceOrder.AddressMaxLength),
            Cut(r.City, MarketplaceOrder.CityMaxLength), Cut(r.State, MarketplaceOrder.CityMaxLength),
            Cut(OrderData.NormalizePostal(r.Postal), MarketplaceOrder.PostalMaxLength),
            cc, Cut(OrderData.CountryName(cc), MarketplaceOrder.CountryNameMaxLength));
        var lines = products.Select(p => new EcomProductDto(p.Name!.Trim(), p.Sku?.Trim() ?? "", p.Qty, p.FobPrice, p.SellingPrice,
            string.IsNullOrWhiteSpace(p.HsCode) ? null : new string(p.HsCode.Where(char.IsDigit).ToArray()))).ToList();
        return (recipient, lines, i.Kg is > 0 ? Math.Round(i.Kg.Value, 3, MidpointRounding.AwayFromZero) : null);
    }

    /// <summary>Mã HS 6–10 số, cho phép dấu chấm / khoảng trắng (6109.10.00).</summary>
    public static bool IsHsCode(string s)
    {
        var digits = s.Where(char.IsDigit).Count();
        return digits is >= 6 and <= 10 && s.All(c => char.IsDigit(c) || c is '.' or ' ');
    }

    private static Error Invalid(string message) => Error.Validation("ECOM_ORDER_INVALID", message);

    private static string? Cut(string? s, int max) => s?.Trim() is { Length: > 0 } t ? (t.Length <= max ? t : t[..max]) : null;
}

internal sealed class OrderImportAndEditHandlers(EcommerceDbContext db, ICurrentUser user, TimeProvider clock) :
    IRequestHandler<ImportOrdersCsvCommand, Result<CsvImportResult>>,
    IRequestHandler<UpdateEcomOrderCommand, Result<EcomOrderDto>>
{
    private const int MaxCsvLength = 5 * 1024 * 1024;
    private const int MaxOrdersPerFile = 1000;

    private DateTime Now => VietnamTime.ToVietnam(clock.GetUtcNow()).DateTime;

    public async Task<Result<CsvImportResult>> Handle(ImportOrdersCsvCommand c, CancellationToken ct)
    {
        if (user.CustomerId is not { } customerId) return StoreErrors.NotLoggedIn;
        if (string.IsNullOrWhiteSpace(c.Csv)) return Error.Validation("ECOM_CSV_EMPTY", "File trống");
        if (c.Csv.Length > MaxCsvLength) return Error.Validation("ECOM_CSV_TOO_LARGE", "File quá lớn (tối đa 5 MB)");

        var rows = Csv.Parse(c.Csv);
        if (rows.Count < 2) return Error.Validation("ECOM_CSV_EMPTY", "File không có dòng đơn nào");
        if (!ShopifyExportParser.IsShopifyExport(rows[0]))
            return Error.Validation("ECOM_CSV_FORMAT", "File chưa đúng định dạng. Hiện nhận file Export orders của Shopify (Orders → Export → CSV for Excel…); mẫu 70 cột của Việt An đang hoàn thiện.");

        var parsed = ShopifyExportParser.Parse(rows);
        var errors = parsed.Errors.Select(e => new CsvRowError(e.Row, e.Message)).ToList();
        var wanted = parsed.Orders.Where(o => !o.Fulfilled && !o.Cancelled).Take(MaxOrdersPerFile).ToList();
        var skipped = parsed.Orders.Count(o => o.Fulfilled || o.Cancelled);

        var ids = wanted.Select(o => o.Order.PlatformOrderId).ToList();
        var existing = await db.MarketplaceOrders
            .Where(o => o.CustomerId == customerId && o.Source == SalesChannelCodes.Shopify && o.PlatformOrderId != null && ids.Contains(o.PlatformOrderId))
            .ToDictionaryAsync(o => o.PlatformOrderId!, ct);

        var now = Now;
        int added = 0, updated = 0, kept = 0;
        foreach (var o in wanted)
        {
            if (existing.TryGetValue(o.Order.PlatformOrderId, out var current))
            {
                if (current.UpdateFrom(o.Order, now)) updated++;
                else kept++;
            }
            else
            {
                db.MarketplaceOrders.Add(MarketplaceOrder.Import(customerId, null, SalesChannelCodes.Shopify, o.Order, now));
                added++;
            }
        }
        await db.SaveChangesAsync(ct);

        var parts = new List<string> { $"Đã nhập {added} đơn mới" };
        if (updated > 0) parts.Add($"cập nhật {updated} đơn");
        if (kept > 0) parts.Add($"giữ nguyên {kept} đơn đã sửa / đã có bill");
        if (skipped > 0) parts.Add($"bỏ qua {skipped} đơn đã giao / đã hủy");
        return new CsvImportResult(string.Join(", ", parts), added, errors);
    }

    public async Task<Result<EcomOrderDto>> Handle(UpdateEcomOrderCommand c, CancellationToken ct)
    {
        if (user.CustomerId is not { } customerId) return StoreErrors.NotLoggedIn;
        var order = await db.MarketplaceOrders.FirstOrDefaultAsync(o => o.Id == c.Id && o.CustomerId == customerId, ct);
        if (order is null) return Error.NotFound("ECOM_ORDER_NOT_FOUND", "Không tìm thấy đơn");
        if (order.Bill is not null) return Error.BusinessRule("ECOM_ORDER_BILLED", "Đơn đã có bill, không sửa được");

        var built = OrderEditRules.Build(c.Input);
        if (built.IsFailure) return built.Error;
        var (recipient, products, weight) = built.Value;
        var i = c.Input;
        order.Edit(recipient, weight, JsonSerializer.Serialize(products, ShopifyOrderMapper.Json), products.Sum(p => p.Qty),
            // Đơn nhập tay: giá trị = tổng tiền hàng; đơn từ sàn giữ tổng của sàn (gồm phí ship khách trả).
            order.Source == MarketplaceOrder.ManualSource ? products.Sum(p => p.SellingPrice * p.Qty) : null,
            Trim(i.Service, MarketplaceOrder.ServiceMaxLength), Trim(i.Hub, MarketplaceOrder.HubMaxLength),
            Trim(i.Branch, MarketplaceOrder.BranchMaxLength), Trim(i.Note, MarketplaceOrder.NoteMaxLength), Now);
        await db.SaveChangesAsync(ct);
        return EcomOrderHandlers.ToDto(order);
    }

    private static string? Trim(string? s, int max) => s?.Trim() is { Length: > 0 } t ? (t.Length <= max ? t : t[..max]) : null;
}
