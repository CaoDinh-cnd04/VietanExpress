using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace VietAnExpress.Ecommerce.Infrastructure.Shopify;

/// <summary>Chủ đề webhook Shopify mà app xử lý (header X-Shopify-Topic).</summary>
internal static class ShopifyTopics
{
    public const string OrdersCreate = "orders/create";
    public const string OrdersUpdated = "orders/updated";
    public const string AppUninstalled = "app/uninstalled";

    // Bắt buộc với app public (GDPR / compliance) — khai trong cấu hình app, không đăng ký bằng API được.
    public const string CustomersDataRequest = "customers/data_request";
    public const string CustomersRedact = "customers/redact";
    public const string ShopRedact = "shop/redact";
}

/// <summary>Nội dung webhook compliance đã đọc: mã đơn Shopify (số) cần trả / xóa dữ liệu, id người mua.</summary>
internal sealed record CompliancePayload(string? ShopDomain, string? CustomerId, IReadOnlyList<string> OrderIds);

/// <summary>Hàm thuần cho webhook Shopify — có test.</summary>
internal static class ShopifyWebhook
{
    /// <summary>
    /// Kiểm chữ ký: header X-Shopify-Hmac-Sha256 = base64(HMAC-SHA256(body thô, client secret)).
    /// So sánh thời gian hằng; thiếu header / secret / sai định dạng base64 → false (controller trả 401).
    /// </summary>
    public static bool IsValidHmac(ReadOnlySpan<byte> body, string? hmacHeader, string clientSecret)
    {
        if (string.IsNullOrWhiteSpace(hmacHeader) || clientSecret.Length == 0) return false;
        Span<byte> received = stackalloc byte[64];
        if (!Convert.TryFromBase64String(hmacHeader.Trim(), received, out var length) || length != 32) return false;
        var expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(clientSecret), body);
        return CryptographicOperations.FixedTimeEquals(expected, received[..length]);
    }

    /// <summary>Đọc payload customers/data_request, customers/redact, shop/redact. JSON lỗi → payload rỗng.</summary>
    public static CompliancePayload ParseCompliance(ReadOnlySpan<byte> body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body.ToArray());
            var root = doc.RootElement;
            string? shop = root.TryGetProperty("shop_domain", out var s) && s.ValueKind == JsonValueKind.String ? s.GetString() : null;
            string? customer = root.TryGetProperty("customer", out var c) && c.ValueKind == JsonValueKind.Object && c.TryGetProperty("id", out var id)
                ? IdText(id) : null;
            var orders = new List<string>();
            foreach (var key in new[] { "orders_to_redact", "orders_requested" })
            {
                if (root.TryGetProperty(key, out var arr) && arr.ValueKind == JsonValueKind.Array)
                    orders.AddRange(arr.EnumerateArray().Select(IdText).OfType<string>());
            }
            return new CompliancePayload(shop, customer, orders.Distinct().ToList());
        }
        catch (JsonException)
        {
            return new CompliancePayload(null, null, []);
        }
    }

    /// <summary>Id Shopify có thể là số hoặc chuỗi (gid://shopify/Order/123) → chỉ lấy phần số, như <c>PlatformOrderId</c>.</summary>
    private static string? IdText(JsonElement e) => e.ValueKind switch
    {
        JsonValueKind.Number => e.GetInt64().ToString(CultureInfo.InvariantCulture),
        JsonValueKind.String when e.GetString() is { Length: > 0 } t => ShopifyOrderMapper.NumericId(t),
        _ => null
    };
}
