using System.Globalization;
using System.Text.Json;
using VietAnExpress.Ecommerce.Domain;
using VietAnExpress.SharedKernel.Application;

namespace VietAnExpress.Ecommerce.Infrastructure.Shopify;

/// <summary>Dòng sản phẩm lưu trong dbo.DonTMDT.San_Pham — trùng <c>EcomProduct</c> của frontend.</summary>
internal sealed record EcomProductDto(string Name, string Sku, int Qty, decimal FobPrice, decimal SellingPrice);

/// <summary>Đọc node Order của GraphQL Admin API thành <see cref="ImportedOrder"/>. Hàm thuần — có test.</summary>
internal static class ShopifyOrderMapper
{
    /// <summary>Truy vấn đơn đang mở, chưa giao — mới nhất trước.</summary>
    public const string OpenOrdersQuery = """
        query($after: String) {
          orders(first: 50, after: $after, sortKey: CREATED_AT, reverse: true, query: "status:open fulfillment_status:unfulfilled") {
            pageInfo { hasNextPage endCursor }
            nodes {
              id name createdAt email phone note currencyCode totalWeight
              totalPriceSet { shopMoney { amount } }
              shippingAddress { name company address1 address2 city province zip country countryCodeV2 phone }
              lineItems(first: 50) { nodes { title sku quantity originalUnitPriceSet { shopMoney { amount } } } }
            }
          }
        }
        """;

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static ImportedOrder Map(JsonElement order)
    {
        var address = Obj(order, "shippingAddress");
        var lines = Obj(order, "lineItems") is { } li && Obj(li, "nodes") is { ValueKind: JsonValueKind.Array } nodes
            ? nodes.EnumerateArray().Select(MapLine).ToList()
            : [];

        var recipient = new MarketplaceRecipient(
            Cut(Str(address, "name"), MarketplaceOrder.NameMaxLength),
            Cut(Str(address, "company"), MarketplaceOrder.NameMaxLength),
            Cut(Str(address, "phone") ?? Str(order, "phone"), MarketplaceOrder.PhoneMaxLength),
            Cut(Str(order, "email"), MarketplaceOrder.EmailMaxLength),
            Cut(Str(address, "address1"), MarketplaceOrder.AddressMaxLength),
            Cut(Str(address, "address2"), MarketplaceOrder.AddressMaxLength),
            Cut(Str(address, "city"), MarketplaceOrder.CityMaxLength),
            Cut(Str(address, "province"), MarketplaceOrder.CityMaxLength),
            Cut(Str(address, "zip"), MarketplaceOrder.PostalMaxLength),
            Str(address, "countryCodeV2") is { Length: 2 } cc ? cc : null,
            Cut(Str(address, "country"), MarketplaceOrder.CountryNameMaxLength));

        // totalWeight: gram (UnsignedInt64, GraphQL trả dạng chuỗi hoặc số); 0 = shop chưa khai cân nặng → chờ cân.
        var grams = Dec(order, "totalWeight");
        return new ImportedOrder(
            PlatformOrderId: NumericId(Str(order, "id") ?? ""),
            OrderName: Cut(Str(order, "name"), MarketplaceOrder.OrderNameMaxLength) ?? "",
            Recipient: recipient,
            ItemCount: lines.Sum(l => l.Qty),
            WeightKg: grams is > 0 ? Math.Round(grams.Value / 1000m, 3) : null,
            Currency: Str(order, "currencyCode") is { Length: 3 } cur ? cur : null,
            TotalAmount: Obj(order, "totalPriceSet") is { } tp && Obj(tp, "shopMoney") is { } sm ? Dec(sm, "amount") : null,
            ProductsJson: lines.Count > 0 ? JsonSerializer.Serialize(lines, Json) : null,
            Note: Cut(Str(order, "note"), MarketplaceOrder.NoteMaxLength),
            PlacedAt: DateTimeOffset.TryParse(Str(order, "createdAt"), CultureInfo.InvariantCulture, DateTimeStyles.None, out var at)
                ? VietnamTime.ToVietnam(at).DateTime
                : null);
    }

    /// <summary>"gid://shopify/Order/123" → "123".</summary>
    public static string NumericId(string gid) => gid[(gid.LastIndexOf('/') + 1)..];

    private static EcomProductDto MapLine(JsonElement l)
    {
        var price = Obj(l, "originalUnitPriceSet") is { } p && Obj(p, "shopMoney") is { } m ? Dec(m, "amount") ?? 0 : 0;
        return new EcomProductDto(Str(l, "title") ?? "", Str(l, "sku") ?? "", (int)(Dec(l, "quantity") ?? 0), price, price);
    }

    private static JsonElement? Obj(JsonElement? e, string name) =>
        e is { ValueKind: JsonValueKind.Object } o && o.TryGetProperty(name, out var v) && v.ValueKind != JsonValueKind.Null ? v : null;

    private static string? Str(JsonElement? e, string name) =>
        Obj(e, name) is { } v ? (v.ValueKind == JsonValueKind.String ? v.GetString() : v.GetRawText()) is { Length: > 0 } s ? s.Trim() : null : null;

    private static decimal? Dec(JsonElement? e, string name) =>
        Obj(e, name) is { } v && (v.ValueKind == JsonValueKind.Number ? v.TryGetDecimal(out var d) : decimal.TryParse(v.GetString(), NumberStyles.Number, CultureInfo.InvariantCulture, out d)) ? d : null;

    private static string? Cut(string? s, int max) => s is null ? null : s.Length <= max ? s : s[..max];
}
