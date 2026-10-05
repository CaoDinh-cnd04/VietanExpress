using System.Globalization;
using System.Text;
using System.Text.Json;
using VietAnExpress.Ecommerce.Application;
using VietAnExpress.Ecommerce.Domain;

namespace VietAnExpress.Ecommerce.Infrastructure.Shopify;

/// <summary>1 đơn đọc từ file Export orders của Shopify.</summary>
/// <param name="Row">Dòng đầu tiên của đơn trong file (tính cả dòng tiêu đề = 1) — để báo lỗi.</param>
internal sealed record ExportedOrder(int Row, ImportedOrder Order, bool Fulfilled, bool Cancelled);

internal sealed record ExportParseResult(IReadOnlyList<ExportedOrder> Orders, IReadOnlyList<(int Row, string Message)> Errors);

/// <summary>
/// Đọc file CSV "Export orders" tải từ Shopify admin (79 cột, mỗi dòng 1 sản phẩm; dòng tiếp theo của cùng đơn chỉ có Name + cột Lineitem).
/// Chuẩn hóa: mã bưu chính bỏ dấu ', số điện thoại thêm mã nước, mã nước → tên nước. Hàm thuần — có test.
/// </summary>
internal static class ShopifyExportParser
{
    private static readonly string[] Required = ["Name", "Id", "Lineitem name", "Lineitem quantity", "Shipping Address1", "Shipping Country"];

    /// <summary>Dòng tiêu đề đúng file Export orders của Shopify.</summary>
    public static bool IsShopifyExport(IReadOnlyList<string> header) => Required.All(header.Contains);

    public static ExportParseResult Parse(IReadOnlyList<IReadOnlyList<string>> rows)
    {
        var header = rows[0];
        var col = header.Select((h, i) => (h, i)).GroupBy(x => x.h).ToDictionary(g => g.Key, g => g.First().i);
        string Get(IReadOnlyList<string> r, string name) => col.TryGetValue(name, out var i) && i < r.Count ? r[i].Trim() : "";

        var orders = new List<ExportedOrder>();
        var errors = new List<(int, string)>();
        foreach (var group in rows.Skip(1).Select((r, i) => (Row: i + 2, Cells: r))
                     .Where(x => x.Cells.Any(c => c.Length > 0))
                     .GroupBy(x => Get(x.Cells, "Name")))
        {
            var first = group.First();
            var h = first.Cells;
            if (group.Key.Length == 0) { errors.Add((first.Row, "Thiếu mã đơn (cột Name)")); continue; }
            var id = Get(h, "Id");
            if (id.Length == 0 || !id.All(char.IsDigit)) { errors.Add((first.Row, $"Đơn {group.Key}: thiếu Id của Shopify")); continue; }

            string Ship(string field) => Get(h, "Shipping " + field) is { Length: > 0 } s ? s : Get(h, "Billing " + field);
            var countryCode = Ship("Country").ToUpperInvariant() is { Length: 2 } cc ? cc : null;
            var province = Ship("Province Name") is { Length: > 0 } pn ? pn : Ship("Province");

            var lines = group.Select(x => x.Cells)
                .Where(r => Get(r, "Lineitem name").Length > 0)
                .Select(r => new EcomProductDto(
                    Get(r, "Lineitem name"), Get(r, "Lineitem sku"),
                    int.TryParse(Get(r, "Lineitem quantity"), out var q) ? q : 1,
                    Money(Get(r, "Lineitem price")) ?? 0, Money(Get(r, "Lineitem price")) ?? 0))
                .ToList();

            var recipient = new MarketplaceRecipient(
                Cut(Ship("Name"), MarketplaceOrder.NameMaxLength),
                Cut(Ship("Company"), MarketplaceOrder.NameMaxLength),
                Cut(OrderData.NormalizePhone(Ship("Phone") is { Length: > 0 } p ? p : Get(h, "Phone"), countryCode), MarketplaceOrder.PhoneMaxLength),
                Cut(Get(h, "Email"), MarketplaceOrder.EmailMaxLength),
                Cut(Ship("Address1"), MarketplaceOrder.AddressMaxLength),
                Cut(Ship("Address2"), MarketplaceOrder.AddressMaxLength),
                Cut(Ship("City"), MarketplaceOrder.CityMaxLength),
                Cut(province, MarketplaceOrder.CityMaxLength),
                Cut(OrderData.NormalizePostal(Ship("Zip")), MarketplaceOrder.PostalMaxLength),
                countryCode,
                Cut(OrderData.CountryName(countryCode), MarketplaceOrder.CountryNameMaxLength));

            var order = new ImportedOrder(
                PlatformOrderId: id,
                OrderName: Cut(group.Key, MarketplaceOrder.OrderNameMaxLength)!,
                Recipient: recipient,
                ItemCount: lines.Sum(l => l.Qty),
                WeightKg: null, // file export không có cân nặng
                Currency: Get(h, "Currency") is { Length: 3 } cur ? cur.ToUpperInvariant() : null,
                TotalAmount: Money(Get(h, "Total")),
                ProductsJson: lines.Count > 0 ? JsonSerializer.Serialize(lines, ShopifyOrderMapper.Json) : null,
                Note: Cut(Get(h, "Notes") is { Length: > 0 } n ? n : null, MarketplaceOrder.NoteMaxLength),
                PlacedAt: DateTimeOffset.TryParseExact(Get(h, "Created at"), "yyyy-MM-dd HH:mm:ss zzz", CultureInfo.InvariantCulture, DateTimeStyles.None, out var at)
                    ? VietAnExpress.SharedKernel.Application.VietnamTime.ToVietnam(at).DateTime
                    : null);

            orders.Add(new ExportedOrder(first.Row, order,
                Fulfilled: Get(h, "Fulfillment Status").Equals("fulfilled", StringComparison.OrdinalIgnoreCase),
                Cancelled: Get(h, "Cancelled at").Length > 0));
        }
        return new ExportParseResult(orders, errors);
    }

    private static decimal? Money(string s) => decimal.TryParse(s, NumberStyles.Number, CultureInfo.InvariantCulture, out var d) ? d : null;

    private static string? Cut(string? s, int max) => s is { Length: > 0 } t ? (t.Length <= max ? t : t[..max]) : null;
}

/// <summary>Đọc CSV theo RFC 4180: ô trong nháy kép có thể chứa dấu phẩy, xuống dòng, "" là 1 dấu nháy. Bỏ BOM đầu file.</summary>
internal static class Csv
{
    public static List<IReadOnlyList<string>> Parse(string text)
    {
        var rows = new List<IReadOnlyList<string>>();
        var row = new List<string>();
        var cell = new StringBuilder();
        var quoted = false;
        var start = text.Length > 0 && text[0] == '﻿' ? 1 : 0;
        for (var i = start; i < text.Length; i++)
        {
            var c = text[i];
            if (quoted)
            {
                if (c != '"') cell.Append(c);
                else if (i + 1 < text.Length && text[i + 1] == '"') { cell.Append('"'); i++; }
                else quoted = false;
            }
            else if (c == '"') quoted = true;
            else if (c == ',') { row.Add(cell.ToString()); cell.Clear(); }
            else if (c is '\r' or '\n')
            {
                if (c == '\r' && i + 1 < text.Length && text[i + 1] == '\n') i++;
                row.Add(cell.ToString()); cell.Clear();
                rows.Add(row); row = [];
            }
            else cell.Append(c);
        }
        if (cell.Length > 0 || row.Count > 0) { row.Add(cell.ToString()); rows.Add(row); }
        return rows;
    }
}
