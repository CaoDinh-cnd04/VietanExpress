using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace VietAnExpress.Shipments.Infrastructure.Geo.GeoNames;

/// <summary>
/// Tra mã bưu chính qua GeoNames <c>postalCodeLookupJSON</c> (~100 nước, nhận cả mã đầy đủ như "SW1A 1AA", "H3Z 2Y7").
/// HttpClient có BaseAddress / timeout lấy từ <see cref="GeoNamesOptions"/> (đăng ký ở ShipmentsModule).
/// </summary>
internal sealed class GeoNamesPostalCodeProvider(
    HttpClient http, IOptions<GeoNamesOptions> options, ILogger<GeoNamesPostalCodeProvider> logger) : IPostalCodeProvider
{
    public const string LookupPath = "postalCodeLookupJSON";

    public async Task<PostalLookupResult> LookupAsync(string countryCode, string postalCode, CancellationToken cancellationToken)
    {
        var username = options.Value.Username.Trim();
        if (username.Length == 0)
        {
            logger.LogWarning("Chưa cấu hình GeoNames:Username — bỏ qua tra mã bưu chính");
            return PostalLookupResult.Unavailable;
        }

        var url = $"{LookupPath}?postalcode={Uri.EscapeDataString(postalCode)}&country={countryCode}&maxRows=1&username={Uri.EscapeDataString(username)}";
        try
        {
            using var response = await http.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("GeoNames trả HTTP {Status} cho {Country}/{Postal}", (int)response.StatusCode, countryCode, postalCode);
                return PostalLookupResult.Unavailable;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            // Lỗi tài khoản / hết lượt trong ngày: HTTP 200 + { status: { message, value } }.
            if (GeoNamesParser.Error(doc) is { } error)
            {
                logger.LogWarning("GeoNames lỗi cho {Country}/{Postal}: {Error}", countryCode, postalCode, error);
                return PostalLookupResult.Unavailable;
            }
            return GeoNamesParser.Postal(doc, countryCode, postalCode) is { } info
                ? PostalLookupResult.Found(info)
                : PostalLookupResult.NotFound;
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException or JsonException)
        {
            logger.LogWarning(e, "Không gọi được GeoNames cho {Country}/{Postal}", countryCode, postalCode);
            return PostalLookupResult.Unavailable;
        }
    }
}

/// <summary>Đọc JSON của GeoNames — hàm thuần, có test.</summary>
internal static class GeoNamesParser
{
    /// <summary>
    /// postalCodeLookupJSON: { postalcodes: [ { placeName: "New York", adminName1: "New York", adminCode1: "NY" } ] }.
    /// (postalCodeSearchJSON dùng khoá "postalCodes" — đọc được cả hai.)
    /// </summary>
    public static PostalInfo? Postal(JsonDocument doc, string countryCode, string postalCode)
    {
        var root = doc.RootElement;
        if (root.ValueKind != JsonValueKind.Object) return null;
        if (!root.TryGetProperty("postalcodes", out var codes) && !root.TryGetProperty("postalCodes", out codes)) return null;
        if (codes.ValueKind != JsonValueKind.Array) return null;

        var first = codes.EnumerateArray().FirstOrDefault();
        if (first.ValueKind != JsonValueKind.Object) return null;
        var city = Str(first, "placeName");
        return city is null ? null : new PostalInfo(countryCode, postalCode, city, Str(first, "adminName1"), Str(first, "adminCode1"));
    }

    /// <summary>Thông báo lỗi ({ status: { message, value } }); null nếu không lỗi.</summary>
    public static string? Error(JsonDocument doc) =>
        doc.RootElement.ValueKind == JsonValueKind.Object && doc.RootElement.TryGetProperty("status", out var status)
            ? Str(status, "message") ?? "lỗi không rõ"
            : null;

    private static string? Str(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String && v.GetString() is { Length: > 0 } s ? s.Trim() : null;
}
