using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using VietAnExpress.Shipments.Infrastructure.Geo;
using VietAnExpress.Shipments.Infrastructure.Geo.GeoNames;
using Xunit;

namespace VietAnExpress.Shipments.Tests.Application;

public class GeoParsersTests
{
    [Fact]
    public void Doc_danh_sach_quoc_gia_va_ma_dien_thoai()
    {
        // Rút gọn đúng định dạng REST Countries v3.1
        const string json = """
            [
              { "name": { "common": "Vietnam" }, "cca2": "VN", "idd": { "root": "+8", "suffixes": ["4"] } },
              { "name": { "common": "United States" }, "cca2": "US", "idd": { "root": "+1", "suffixes": ["201", "202", "203"] } },
              { "name": { "common": "Antarctica" }, "cca2": "AQ", "idd": {} },
              { "name": { "common": "" }, "cca2": "XX", "idd": { "root": "+9" } }
            ]
            """;

        var countries = GeoParsers.ParseCountries(JsonDocument.Parse(json));

        Assert.Equal(["AQ", "US", "VN"], countries.Select(c => c.Code));   // sắp theo tên, bỏ dòng thiếu tên
        Assert.Equal("+84", countries.Single(c => c.Code == "VN").DialCode); // 1 suffix → mã đầy đủ
        Assert.Equal("+1", countries.Single(c => c.Code == "US").DialCode);  // nhiều suffix (mã vùng) → chỉ root
        Assert.Null(countries.Single(c => c.Code == "AQ").DialCode);
    }

    [Theory]
    [InlineData("us", " sw1a   1aa ", "US", "SW1A 1AA")]
    [InlineData(" gb ", "h3z2y7", "GB", "H3Z2Y7")]
    public void Chuan_hoa_ma_buu_chinh(string country, string postal, string cc, string expected) =>
        Assert.Equal((cc, expected), GeoParsers.NormalizePostal(country, postal));

    [Theory]
    [InlineData("USA")]
    [InlineData("U1")]
    public void Ma_nuoc_sai_thi_bo(string country) => Assert.Null(GeoParsers.NormalizePostal(country, "10002"));

    [Theory]
    [InlineData("US", "10002", new[] { "10002" })]
    [InlineData("GB", "SW1A 1AA", new[] { "SW1A 1AA", "SW1A" })]
    [InlineData("GB", "SW1A1AA", new[] { "SW1A1AA", "SW1A" })]
    [InlineData("CA", "H0H0H0", new[] { "H0H0H0", "H0H" })]
    [InlineData("CA", "H0H 0H0", new[] { "H0H 0H0", "H0H" })]
    [InlineData("JP", "100-0001", new[] { "100-0001" })]
    public void Thu_ma_day_du_roi_phan_dau(string country, string postal, string[] expected) =>
        Assert.Equal(expected, GeoParsers.PostalCandidates(country, postal));
}

public class GeoNamesParserTests
{
    [Fact]
    public void Doc_ket_qua_postalCodeLookupJSON()
    {
        // Rút gọn đúng phản hồi thật của GeoNames cho US/10002
        const string json = """
            { "postalcodes": [ { "adminCode2": "061", "adminCode1": "NY", "adminName2": "New York", "lng": -73.98,
                                 "countryCode": "US", "postalcode": "10002", "adminName1": "New York", "placeName": "New York", "lat": 40.71 } ] }
            """;

        Assert.Equal(new PostalInfo("US", "10002", "New York", "New York", "NY"), GeoNamesParser.Postal(JsonDocument.Parse(json), "US", "10002"));
        Assert.Null(GeoNamesParser.Postal(JsonDocument.Parse("""{ "postalcodes": [] }"""), "US", "00000"));
        Assert.Null(GeoNamesParser.Postal(JsonDocument.Parse("[]"), "US", "00000"));
    }

    [Fact]
    public void Singapore_khong_co_bang_van_doc_duoc() =>
        Assert.Equal(
            new PostalInfo("SG", "238859", "Orchard Road", null, null),
            GeoNamesParser.Postal(JsonDocument.Parse("""{ "postalcodes": [ { "countryCode": "SG", "postalcode": "238859", "placeName": "Orchard Road" } ] }"""), "SG", "238859"));

    [Fact]
    public void Doc_loi_GeoNames()
    {
        Assert.Equal("user does not exist.", GeoNamesParser.Error(JsonDocument.Parse("""{ "status": { "message": "user does not exist.", "value": 10 } }""")));
        Assert.Null(GeoNamesParser.Error(JsonDocument.Parse("""{ "postalcodes": [] }""")));
    }
}

internal sealed class FakeHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
{
    public int Calls { get; private set; }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Calls++;
        return Task.FromResult(respond(request));
    }

    public static HttpResponseMessage Json(string body, HttpStatusCode status = HttpStatusCode.OK) =>
        new(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
}

public class GeoNamesPostalCodeProviderTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static GeoNamesPostalCodeProvider Provider(FakeHandler handler, string username = "vietanexpress") =>
        new(new HttpClient(handler) { BaseAddress = new Uri("https://secure.geonames.org/") },
            Options.Create(new GeoNamesOptions { Username = username }), NullLogger<GeoNamesPostalCodeProvider>.Instance);

    [Fact]
    public async Task Goi_dung_endpoint_va_tham_so()
    {
        var handler = new FakeHandler(req =>
        {
            Assert.Equal("https://secure.geonames.org/postalCodeLookupJSON?postalcode=SW1A%201AA&country=GB&maxRows=1&username=vietanexpress",
                req.RequestUri!.AbsoluteUri);
            return FakeHandler.Json("""{ "postalcodes": [ { "placeName": "London", "adminName1": "England", "adminCode1": "ENG" } ] }""");
        });

        var result = await Provider(handler).LookupAsync("GB", "SW1A 1AA", Ct);

        Assert.Equal(PostalLookupStatus.Found, result.Status);
        Assert.Equal("London", result.Info!.City);
    }

    [Fact]
    public async Task Khong_co_du_lieu_la_NotFound() =>
        Assert.Equal(PostalLookupStatus.NotFound,
            (await Provider(new FakeHandler(_ => FakeHandler.Json("""{ "postalcodes": [] }"""))).LookupAsync("VN", "700000", Ct)).Status);

    [Theory]
    [InlineData("""{ "status": { "message": "the daily limit of 20000 credits has been exceeded", "value": 18 } }""", HttpStatusCode.OK)]
    [InlineData("{}", HttpStatusCode.ServiceUnavailable)]
    [InlineData("not json", HttpStatusCode.OK)]
    public async Task Loi_tai_khoan_het_luot_hoac_may_chu_loi_la_Unavailable(string body, HttpStatusCode status) =>
        Assert.Equal(PostalLookupStatus.Unavailable,
            (await Provider(new FakeHandler(_ => FakeHandler.Json(body, status))).LookupAsync("US", "10002", Ct)).Status);

    [Fact]
    public async Task Chua_cau_hinh_tai_khoan_thi_khong_goi_ra_ngoai()
    {
        var handler = new FakeHandler(_ => throw new InvalidOperationException("không được gọi"));

        Assert.Equal(PostalLookupStatus.Unavailable, (await Provider(handler, username: " ").LookupAsync("US", "10002", Ct)).Status);
        Assert.Equal(0, handler.Calls);
    }
}

public class GeoLookupServiceTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    /// <summary>Nguồn mã bưu chính giả: trả theo bảng, ghi lại các mã đã hỏi.</summary>
    private sealed class FakeProvider(Func<string, PostalLookupResult> respond) : IPostalCodeProvider
    {
        public List<string> Asked { get; } = [];

        public Task<PostalLookupResult> LookupAsync(string countryCode, string postalCode, CancellationToken cancellationToken)
        {
            Asked.Add($"{countryCode}/{postalCode}");
            return Task.FromResult(respond(postalCode));
        }
    }

    private static PostalLookupResult Found(string city) => PostalLookupResult.Found(new PostalInfo("XX", "?", city, null, null));

    private static GeoLookupService Service(IPostalCodeProvider provider) =>
        new(new HttpClient(new FakeHandler(_ => throw new HttpRequestException("mất mạng"))), provider,
            new MemoryCache(new MemoryCacheOptions()), NullLogger<GeoLookupService>.Instance);

    [Fact]
    public async Task Chuan_hoa_roi_hoi_nguon_va_cache_lai()
    {
        var provider = new FakeProvider(_ => Found("New York"));
        var geo = Service(provider);

        var first = await geo.LookupPostalAsync("us", " 10002 ", Ct);
        var second = await geo.LookupPostalAsync("US", "10002", Ct);

        Assert.Equal("New York", first!.City);
        Assert.Equal("10002", first.PostalCode);
        Assert.Equal(first, second);
        Assert.Equal(["US/10002"], provider.Asked); // lần 2 lấy từ cache
    }

    [Fact]
    public async Task Ma_day_du_khong_co_thi_thu_phan_dau()
    {
        var provider = new FakeProvider(postal => postal == "SW1A" ? Found("London") : PostalLookupResult.NotFound);

        var info = await Service(provider).LookupPostalAsync("gb", "sw1a  1aa", Ct);

        Assert.Equal("London", info!.City);
        Assert.Equal("SW1A 1AA", info.PostalCode); // giữ mã khách gõ
        Assert.Equal(["GB/SW1A 1AA", "GB/SW1A"], provider.Asked);
    }

    [Fact]
    public async Task Khong_tim_thay_thi_cache_khong_hoi_lai()
    {
        var provider = new FakeProvider(_ => PostalLookupResult.NotFound);
        var geo = Service(provider);

        Assert.Null(await geo.LookupPostalAsync("VN", "700000", Ct));
        Assert.Null(await geo.LookupPostalAsync("VN", "700000", Ct));
        Assert.Single(provider.Asked);
    }

    [Fact]
    public async Task Nguon_loi_thi_khong_cache_lan_sau_thu_lai()
    {
        var provider = new FakeProvider(_ => PostalLookupResult.Unavailable);
        var geo = Service(provider);

        Assert.Null(await geo.LookupPostalAsync("US", "10002", Ct));
        Assert.Null(await geo.LookupPostalAsync("US", "10002", Ct));
        Assert.Equal(2, provider.Asked.Count);
    }

    [Theory]
    [InlineData("USA", "94526")]
    [InlineData("US", "9")]
    [InlineData("US", "94526/../x")]
    public async Task Du_lieu_nhap_sai_khong_hoi_nguon(string country, string postal)
    {
        var provider = new FakeProvider(_ => throw new InvalidOperationException("không được gọi"));

        Assert.Null(await Service(provider).LookupPostalAsync(country, postal, Ct));
        Assert.Empty(provider.Asked);
    }

    [Fact]
    public async Task Danh_sach_nuoc_loi_thi_tra_rong_khong_nem_loi() =>
        Assert.Empty(await Service(new FakeProvider(_ => PostalLookupResult.NotFound)).GetCountriesAsync(Ct));
}
