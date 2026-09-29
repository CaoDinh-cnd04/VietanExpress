using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using VietAnExpress.Shipments.Infrastructure.Geo;
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

    [Fact]
    public void Doc_ket_qua_ma_buu_chinh()
    {
        const string json = """
            { "post code": "94526", "country abbreviation": "US",
              "places": [ { "place name": "Danville", "state": "California", "state abbreviation": "CA" } ] }
            """;

        var info = GeoParsers.ParsePostal(JsonDocument.Parse(json), "US", "94526");

        Assert.Equal(new PostalInfo("US", "94526", "Danville", "California", "CA"), info);
        Assert.Null(GeoParsers.ParsePostal(JsonDocument.Parse("{}"), "US", "00000"));
    }
}

public class GeoLookupServiceTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private sealed class FakeHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public int Calls { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;
            return Task.FromResult(respond(request));
        }
    }

    private static HttpResponseMessage Json(HttpStatusCode status, string body) =>
        new(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

    private static GeoLookupService Service(FakeHandler handler) =>
        new(new HttpClient(handler), new MemoryCache(new MemoryCacheOptions()), NullLogger<GeoLookupService>.Instance);

    [Fact]
    public async Task Tra_ma_buu_chinh_goi_dung_url_va_cache_lai()
    {
        var handler = new FakeHandler(req =>
        {
            Assert.Equal("https://api.zippopotam.us/us/94526", req.RequestUri!.ToString());
            return Json(HttpStatusCode.OK, """{ "places": [ { "place name": "Danville", "state": "California", "state abbreviation": "CA" } ] }""");
        });
        var geo = Service(handler);

        var first = await geo.LookupPostalAsync("us", " 94526 ", Ct);
        var second = await geo.LookupPostalAsync("US", "94526", Ct);

        Assert.Equal("Danville", first!.City);
        Assert.Equal(first, second);
        Assert.Equal(1, handler.Calls); // lần 2 lấy từ cache
    }

    [Fact]
    public async Task Khong_tim_thay_tra_null_va_khong_goi_lai()
    {
        var handler = new FakeHandler(_ => Json(HttpStatusCode.NotFound, "{}"));
        var geo = Service(handler);

        Assert.Null(await geo.LookupPostalAsync("US", "00000", Ct));
        Assert.Null(await geo.LookupPostalAsync("US", "00000", Ct));
        Assert.Equal(1, handler.Calls);
    }

    [Theory]
    [InlineData("USA", "94526")]
    [InlineData("US", "9")]
    [InlineData("US", "94526/../x")]
    public async Task Du_lieu_nhap_sai_khong_goi_ra_ngoai(string country, string postal)
    {
        var handler = new FakeHandler(_ => throw new InvalidOperationException("không được gọi"));

        Assert.Null(await Service(handler).LookupPostalAsync(country, postal, Ct));
        Assert.Equal(0, handler.Calls);
    }

    [Fact]
    public async Task API_ngoai_loi_thi_tra_rong_khong_nem_loi()
    {
        var handler = new FakeHandler(_ => throw new HttpRequestException("mất mạng"));
        var geo = Service(handler);

        Assert.Empty(await geo.GetCountriesAsync(Ct));
        Assert.Null(await geo.LookupPostalAsync("US", "94526", Ct));
    }
}
