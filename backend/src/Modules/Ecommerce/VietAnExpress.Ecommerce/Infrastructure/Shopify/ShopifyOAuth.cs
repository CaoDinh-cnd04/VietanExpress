using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace VietAnExpress.Ecommerce.Infrastructure.Shopify;

/// <summary>Hàm thuần cho OAuth Shopify (authorization code grant) — có test.</summary>
internal static partial class ShopifyOAuth
{
    private const string Suffix = ".myshopify.com";

    [GeneratedRegex("^[a-z0-9][a-z0-9-]{0,59}$")]
    private static partial Regex Handle();

    /// <summary>
    /// Chuẩn hóa tên shop về "xxx.myshopify.com" (giống <c>normalizeShopifyDomain</c> của frontend).
    /// Callback cũng dùng hàm này để chặn tham số <c>shop</c> giả trỏ tới host khác.
    /// </summary>
    public static string? NormalizeShop(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        var s = input.Trim().ToLowerInvariant();
        if (s.StartsWith("https://", StringComparison.Ordinal)) s = s[8..];
        else if (s.StartsWith("http://", StringComparison.Ordinal)) s = s[7..];
        const string adminStore = "admin.shopify.com/store/";
        if (s.StartsWith(adminStore, StringComparison.Ordinal)) s = s[adminStore.Length..];
        s = s.Split('/', '?', '#')[0];
        var handle = s.EndsWith(Suffix, StringComparison.Ordinal) ? s[..^Suffix.Length] : s;
        return Handle().IsMatch(handle) ? handle + Suffix : null;
    }

    public static string AuthorizeUrl(string shop, string clientId, string scopes, string redirectUri, string state) =>
        $"https://{shop}/admin/oauth/authorize?client_id={Uri.EscapeDataString(clientId)}&scope={Uri.EscapeDataString(scopes)}" +
        $"&redirect_uri={Uri.EscapeDataString(redirectUri)}&state={Uri.EscapeDataString(state)}";

    /// <summary>
    /// Kiểm HMAC của callback: bỏ <c>hmac</c> (và <c>signature</c>), sắp tham số theo tên, nối "k=v" bằng "&amp;",
    /// HMAC-SHA256 bằng client secret, so dạng hex (so sánh thời gian hằng).
    /// </summary>
    public static bool IsValidHmac(IEnumerable<KeyValuePair<string, string>> query, string clientSecret)
    {
        var pairs = query.ToList();
        var hmac = pairs.FirstOrDefault(p => p.Key == "hmac").Value;
        if (string.IsNullOrEmpty(hmac) || clientSecret.Length == 0) return false;

        var message = string.Join('&', pairs
            .Where(p => p.Key is not ("hmac" or "signature"))
            .OrderBy(p => p.Key, StringComparer.Ordinal)
            .Select(p => $"{p.Key}={p.Value}"));
        var expected = Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(clientSecret), Encoding.UTF8.GetBytes(message)));
        return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(expected), Encoding.ASCII.GetBytes(hmac.ToLowerInvariant()));
    }

    /// <summary>Query Shopify gắn khi mở app (application_url): chữ ký đúng và đúng shop đang kết nối.</summary>
    public static bool IsValidLaunch(IReadOnlyList<KeyValuePair<string, string>> query, string shop, string clientSecret) =>
        NormalizeShop(query.FirstOrDefault(p => p.Key == "shop").Value) == shop && IsValidHmac(query, clientSecret);
}
