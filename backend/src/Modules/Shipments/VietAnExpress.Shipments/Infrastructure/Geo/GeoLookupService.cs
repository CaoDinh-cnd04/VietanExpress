using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace VietAnExpress.Shipments.Infrastructure.Geo;

/// <summary>Quốc gia: mã ISO 2 ký tự, tên tiếng Anh (khớp cột ConsigneeCountry cũ), mã điện thoại.</summary>
internal sealed record CountryInfo(string Code, string Name, string? DialCode);

/// <summary>Kết quả tra mã bưu chính.</summary>
internal sealed record PostalInfo(string CountryCode, string PostalCode, string City, string? State, string? StateCode);

/// <summary>Tra cứu địa lý cho form tạo đơn / import — điểm vào duy nhất mà API và các handler dùng.</summary>
internal interface IGeoLookup
{
    Task<IReadOnlyList<CountryInfo>> GetCountriesAsync(CancellationToken cancellationToken);

    /// <summary>Null khi không tìm thấy, nước chưa được hỗ trợ hoặc nguồn tạm lỗi.</summary>
    Task<PostalInfo?> LookupPostalAsync(string countryCode, string postalCode, CancellationToken cancellationToken);

    /// <summary>Gợi ý địa chỉ trong 1 nước theo chữ khách gõ. Rỗng khi chữ quá ngắn, chưa cấu hình hoặc nguồn tạm lỗi.</summary>
    Task<IReadOnlyList<AddressSuggestion>> SuggestAddressesAsync(string countryCode, string query, CancellationToken cancellationToken);
}

/// <summary>
/// Điều phối tra cứu địa lý:
/// - Danh sách nước + mã điện thoại: bộ dữ liệu world-countries (nguồn gốc của REST Countries) qua CDN jsDelivr — cache 1 ngày.
///   (REST Countries v3.1 đã ngừng, v5 bắt buộc API key.) Ghim phiên bản để dữ liệu không tự đổi.
/// - Mã bưu chính: chuẩn hóa + kiểm tra đầu vào, cache, rồi hỏi <see cref="IPostalCodeProvider"/> (hiện là GeoNames);
///   mã đầy đủ không có dữ liệu thì thử phần đầu của mã. Có kết quả cache 7 ngày, không có cache 6 giờ, nguồn lỗi không cache.
/// - Gợi ý địa chỉ: <see cref="IAddressSuggestionProvider"/> (hiện là Geoapify), cache 1 ngày theo nước + chữ gõ để tiết kiệm lượt gọi.
/// API ngoài lỗi / chậm thì trả rỗng, không làm hỏng form tạo đơn.
/// </summary>
internal sealed partial class GeoLookupService(
    HttpClient http, IPostalCodeProvider postalProvider, IAddressSuggestionProvider addressProvider, IMemoryCache cache,
    ILogger<GeoLookupService> logger) : IGeoLookup
{
    public const string CountriesUrl = "https://cdn.jsdelivr.net/npm/world-countries@5.1.0/countries.json";

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
        if (GeoParsers.NormalizePostal(countryCode, postalCode) is not { } normalized || !PostalPattern().IsMatch(normalized.PostalCode)) return null;
        var (cc, postal) = normalized;

        var key = $"geo:postal:{cc}:{postal}";
        if (cache.TryGetValue(key, out PostalInfo? cached)) return cached;

        PostalInfo? info = null;
        foreach (var candidate in GeoParsers.PostalCandidates(cc, postal))
        {
            var result = await postalProvider.LookupAsync(cc, candidate, cancellationToken);
            if (result.Status == PostalLookupStatus.Unavailable) return null; // lỗi tạm thời → không cache, lần sau thử lại
            if (result.Info is { } found)
            {
                info = found with { PostalCode = postal };
                break;
            }
        }
        cache.Set(key, info, info is null ? TimeSpan.FromHours(6) : TimeSpan.FromDays(7));
        return info;
    }

    public async Task<IReadOnlyList<AddressSuggestion>> SuggestAddressesAsync(string countryCode, string query, CancellationToken cancellationToken)
    {
        if (GeoParsers.NormalizeAddressQuery(countryCode, query) is not { } normalized) return [];
        var (cc, text) = normalized;

        var key = $"geo:address:{cc}:{text.ToLowerInvariant()}";
        if (cache.TryGetValue(key, out IReadOnlyList<AddressSuggestion>? cached) && cached is not null) return cached;

        var result = await addressProvider.SuggestAsync(cc, text, cancellationToken);
        if (result.Available) cache.Set(key, result.Items, TimeSpan.FromDays(1));
        return result.Items;
    }
}

/// <summary>Hàm thuần dùng chung (đọc dữ liệu nước, chuẩn hóa mã bưu chính) — có test.</summary>
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

    /// <summary>Mã nước ISO 2 chữ hoa; mã bưu chính chữ hoa, gộp khoảng trắng. Null nếu mã nước sai.</summary>
    public static (string CountryCode, string PostalCode)? NormalizePostal(string countryCode, string postalCode)
    {
        var cc = countryCode.Trim().ToUpperInvariant();
        if (cc.Length != 2 || !cc.All(char.IsAsciiLetterUpper)) return null;
        var postal = string.Join(' ', postalCode.Trim().ToUpperInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries));
        return (cc, postal);
    }

    /// <summary>Chữ khách gõ để gợi ý địa chỉ: gộp khoảng trắng, 3–120 ký tự. Null nếu mã nước sai hoặc chữ quá ngắn / dài.</summary>
    public static (string CountryCode, string Query)? NormalizeAddressQuery(string countryCode, string query)
    {
        var cc = countryCode.Trim().ToUpperInvariant();
        if (cc.Length != 2 || !cc.All(char.IsAsciiLetterUpper)) return null;
        var text = string.Join(' ', query.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        return text.Length is >= 3 and <= 120 ? (cc, text) : null;
    }

    /// <summary>
    /// Các dạng mã thử lần lượt: mã đầy đủ trước, rồi phần đầu của mã (một số nước chỉ có dữ liệu theo vùng):
    /// "SW1A 1AA" → "SW1A"; Anh gõ liền "SW1A1AA" → "SW1A"; Canada "H0H0H0" → "H0H".
    /// </summary>
    public static IReadOnlyList<string> PostalCandidates(string countryCode, string postal)
    {
        var list = new List<string> { postal };
        var compact = postal.Replace(" ", "");
        var prefix = postal.Contains(' ') ? postal.Split(' ')[0]
            : countryCode == "GB" && compact.Length is >= 5 and <= 7 ? compact[..^3]
            : countryCode == "CA" && compact.Length == 6 ? compact[..3]
            : null;
        if (prefix is { Length: >= 2 } && prefix != postal) list.Add(prefix);
        return list;
    }
                                                                                                                                                                                                                                                                                                                                                                                            }
