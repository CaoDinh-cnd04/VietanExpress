using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace VietAnExpress.Shipments.Infrastructure.Geo;

/// <summary>Quốc gia: mã ISO 2 ký tự, tên tiếng Anh (khớp cột ConsigneeCountry cũ), mã điện thoại.</summary>
internal sealed record CountryInfo(string Code, string Name, string? DialCode);

/// <summary>Kết quả tra mã bưu chính.</summary>
internal sealed record PostalInfo(string CountryCode, string PostalCode, string City, string? State, string? StateCode);

internal interface IGeoLookup
{
    Task<IReadOnlyList<CountryInfo>> GetCountriesAsync(CancellationToken cancellationToken);

    /// <summary>Null khi không tìm thấy hoặc nước chưa được hỗ trợ.</summary>
    Task<PostalInfo?> LookupPostalAsync(string countryCode, string postalCode, CancellationToken cancellationToken);
}

/// <summary>
/// Tra cứu địa lý qua API ngoài miễn phí, không cần key:
/// - Bộ dữ liệu world-countries (nguồn gốc của REST Countries) qua CDN jsDelivr: danh sách nước + mã điện thoại — cache 1 ngày.
///   (REST Countries v3.1 đã ngừng, v5 bắt buộc API key.) Ghim phiên bản để dữ liệu không tự đổi.
/// - Zippopotam.us: mã bưu chính → thành phố, tỉnh / bang (~60 nước) — cache 7 ngày mỗi mã.
/// API ngoài lỗi / chậm thì trả rỗng, không làm hỏng form tạo đơn.
/// </summary>
internal sealed partial class GeoLookupService(HttpClient http, IMemoryCache cache, ILogger<GeoLookupService> logger) : IGeoLookup
{
    public const string CountriesUrl = "https://cdn.jsdelivr.net/npm/world-countries@5.1.0/countries.json";
    public const string PostalUrl = "https://api.zippopotam.us";

    [GeneratedRegex("^[A-Z0-9][A-Z0-9 -]{1,11}$")]
    private static partial Regex PostalPattern();

    public async Task<IReadOnlyList<CountryInfo>> GetCountriesAsync(CancellationToken cancellationToken)
    {
        if (cache.TryGetValue("geo:countries", out IReadOnlyList<CountryInfo>? cached) && cached is not null) return cached;
        try
        {
            await using var stream = await http.GetStreamAsync(CountriesUrl, cancellationToken);
            var countries = GeoParsers.ParseCountries(await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken));
            if (countries.Count > 0) cache.Set("geo:countries", countries, TimeSpan.FromDays(1));
            return countries;
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException or JsonException)
        {
            logger.LogWarning(e, "Không lấy được danh sách quốc gia (world-countries)");
            return [];
        }
    }

    public async Task<PostalInfo?> LookupPostalAsync(string countryCode, string postalCode, CancellationToken cancellationToken)
    {
        var cc = countryCode.Trim().ToUpperInvariant();
        var postal = postalCode.Trim().ToUpperInvariant();
        if (cc.Length != 2 || !cc.All(char.IsAsciiLetterUpper) || !PostalPattern().IsMatch(postal)) return null;

        var key = $"geo:postal:{cc}:{postal}";
        if (cache.TryGetValue(key, out PostalInfo? cached)) return cached;
        try
        {
            using var response = await http.GetAsync($"{PostalUrl}/{cc.ToLowerInvariant()}/{Uri.EscapeDataString(postal)}", cancellationToken);
            PostalInfo? info = null;
            if (response.IsSuccessStatusCode)
            {
                await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                info = GeoParsers.ParsePostal(await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken), cc, postal);
            }
            else if (response.StatusCode != HttpStatusCode.NotFound)
            {
                logger.LogWarning("Zippopotam trả {Status} cho {Country}/{Postal}", (int)response.StatusCode, cc, postal);
                return null; // lỗi tạm thời → không cache
            }
            // Không tìm thấy cũng cache (ngắn hơn) để khách gõ lại không gọi ra ngoài liên tục.
            cache.Set(key, info, info is null ? TimeSpan.FromHours(6) : TimeSpan.FromDays(7));
            return info;
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException or JsonException)
        {
            logger.LogWarning(e, "Không tra được mã bưu chính {Country}/{Postal}", cc, postal);
            return null;
        }
    }
}

/// <summary>Đọc JSON của API ngoài — hàm thuần, có test.</summary>
internal static class GeoParsers
{
    /// <summary>
    /// world-countries / REST Countries: idd = { root: "+1", suffixes: ["201", …] }.
    /// 1 suffix → mã đầy đủ (Việt Nam "+84"); nhiều suffix (Mỹ, Canada: mã vùng) → chỉ lấy root "+1".
    /// </summary>
    public static IReadOnlyList<CountryInfo> ParseCountries(JsonDocument doc)
    {
        var list = new List<CountryInfo>();
        foreach (var c in doc.RootElement.EnumerateArray())
        {
            var code = c.TryGetProperty("cca2", out var cca2) ? cca2.GetString() : null;
            var name = c.TryGetProperty("name", out var n) && n.TryGetProperty("common", out var common) ? common.GetString() : null;
            if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name)) continue;

            string? dial = null;
            if (c.TryGetProperty("idd", out var idd) && idd.TryGetProperty("root", out var root) && root.GetString() is { Length: > 0 } r)
            {
                var suffixes = idd.TryGetProperty("suffixes", out var s) && s.ValueKind == JsonValueKind.Array
                    ? s.EnumerateArray().Select(x => x.GetString()).Where(x => !string.IsNullOrEmpty(x)).ToList()
                    : [];
                dial = suffixes.Count == 1 ? r + suffixes[0] : r;
            }
            list.Add(new CountryInfo(code.ToUpperInvariant(), name, dial));
        }
        return list.OrderBy(c => c.Name, StringComparer.OrdinalIgnoreCase).ToList();
    }

    /// <summary>Zippopotam: { places: [ { "place name": "Danville", "state": "California", "state abbreviation": "CA" } ] }.</summary>
    public static PostalInfo? ParsePostal(JsonDocument doc, string countryCode, string postalCode)
    {
        if (!doc.RootElement.TryGetProperty("places", out var places) || places.ValueKind != JsonValueKind.Array) return null;
        var first = places.EnumerateArray().FirstOrDefault();
        if (first.ValueKind != JsonValueKind.Object) return null;

        var city = Str(first, "place name");
        if (string.IsNullOrWhiteSpace(city)) return null;
        return new PostalInfo(countryCode, postalCode, city, Str(first, "state"), Str(first, "state abbreviation"));
    }

    private static string? Str(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.GetString() is { Length: > 0 } s ? s.Trim() : null;
}
