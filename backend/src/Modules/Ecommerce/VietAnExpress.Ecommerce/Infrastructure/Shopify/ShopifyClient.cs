using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace VietAnExpress.Ecommerce.Infrastructure.Shopify;

/// <summary>Token Shopify vừa nhận. Token có hạn (expiring=1) kèm refresh token 90 ngày.</summary>
internal sealed record ShopifyToken(string AccessToken, string Scopes, int? ExpiresIn, string? RefreshToken, int? RefreshTokenExpiresIn);

internal sealed record ShopifyShopInfo(string Name, string? Currency, string? PrimaryDomain);

/// <summary>Gọi Shopify Admin API của 1 shop (host luôn là xxx.myshopify.com đã kiểm bằng <see cref="ShopifyOAuth.NormalizeShop"/>).</summary>
internal sealed class ShopifyClient(HttpClient http, IOptions<ShopifyOptions> options, ILogger<ShopifyClient> logger)
{
    private ShopifyOptions O => options.Value;

    /// <summary>Đổi authorization code lấy token (code dùng 1 lần). Null khi Shopify từ chối.</summary>
    public async Task<ShopifyToken?> ExchangeCodeAsync(string shop, string code, CancellationToken ct)
    {
        using var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = O.ClientId,
            ["client_secret"] = O.ClientSecret,
            ["code"] = code,
            ["expiring"] = "1"
        });
        using var res = await http.PostAsync($"https://{shop}/admin/oauth/access_token", body, ct);
        if (!res.IsSuccessStatusCode)
        {
            logger.LogWarning("Shopify từ chối đổi code cho {Shop}: HTTP {Status}", shop, (int)res.StatusCode);
            return null;
        }
        var t = await res.Content.ReadFromJsonAsync<TokenResponse>(ct);
        return t?.AccessToken is { Length: > 0 } access
            ? new ShopifyToken(access, t.Scope ?? "", t.ExpiresIn, t.RefreshToken, t.RefreshTokenExpiresIn)
            : null;
    }

    public async Task<ShopifyShopInfo?> GetShopAsync(string shop, string accessToken, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, $"https://{shop}/admin/api/{O.ApiVersion}/graphql.json")
        {
            Content = JsonContent.Create(new { query = "{ shop { name currencyCode primaryDomain { host } } }" })
        };
        req.Headers.Add("X-Shopify-Access-Token", accessToken);
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        using var res = await http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode) return null;

        using var doc = await JsonDocument.ParseAsync(await res.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        if (!doc.RootElement.TryGetProperty("data", out var data) || !data.TryGetProperty("shop", out var s)) return null;
        return new ShopifyShopInfo(
            s.GetProperty("name").GetString() ?? shop,
            s.TryGetProperty("currencyCode", out var c) ? c.GetString() : null,
            s.TryGetProperty("primaryDomain", out var d) && d.ValueKind == JsonValueKind.Object ? d.GetProperty("host").GetString() : null);
    }

    /// <summary>Gỡ app khỏi shop (thu hồi token, Shopify tự hủy webhook). Lỗi chỉ ghi log — ngắt kết nối phía Việt An vẫn tiếp tục.</summary>
    public async Task RevokeAsync(string shop, string accessToken, CancellationToken ct)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Delete, $"https://{shop}/admin/api_permissions/current.json");
            req.Headers.Add("X-Shopify-Access-Token", accessToken);
            using var res = await http.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode) logger.LogWarning("Không gỡ được app khỏi {Shop}: HTTP {Status}", shop, (int)res.StatusCode);
        }
        catch (HttpRequestException e)
        {
            logger.LogWarning(e, "Không gỡ được app khỏi {Shop}", shop);
        }
    }

    private sealed record TokenResponse(
        [property: JsonPropertyName("access_token")] string? AccessToken,
        [property: JsonPropertyName("scope")] string? Scope,
        [property: JsonPropertyName("expires_in")] int? ExpiresIn,
        [property: JsonPropertyName("refresh_token")] string? RefreshToken,
        [property: JsonPropertyName("refresh_token_expires_in")] int? RefreshTokenExpiresIn);
}
