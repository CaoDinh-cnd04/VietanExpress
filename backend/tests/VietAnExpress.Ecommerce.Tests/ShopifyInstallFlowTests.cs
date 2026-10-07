using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using VietAnExpress.Ecommerce.Application;
using VietAnExpress.Ecommerce.Contracts;
using VietAnExpress.Ecommerce.Domain;
using VietAnExpress.Ecommerce.Infrastructure;
using VietAnExpress.Ecommerce.Infrastructure.Shopify;
using VietAnExpress.SharedKernel.Application;
using Xunit;

namespace VietAnExpress.Ecommerce.Tests;

/// <summary>
/// Cài app từ Shopify (App Store 2.3.1–2.3.4): mở app → OAuth ngay, chưa cần đăng nhập portal; token giữ trong cookie mã hóa,
/// khách đăng nhập xong mới gắn shop vào tài khoản; cài lại thì cập nhật kết nối cũ, không tạo trùng.
/// </summary>
public class ShopifyInstallFlowTests
{
    private const string Secret = "shpss_test_secret";
    private const string Shop = "demo.myshopify.com";
    private const string Host = "portal.example.com";
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private sealed class FakeShopify : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var json = request.RequestUri!.AbsolutePath.EndsWith("/oauth/access_token", StringComparison.Ordinal)
                ? """{"access_token":"shpat_new","scope":"read_orders"}"""
                : """{"data":{"shop":{"name":"Demo Store","currencyCode":"USD","primaryDomain":{"host":"demo.com"}}}}""";
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") });
        }
    }

    private sealed class Fixture : IDisposable
    {
        public EcommerceDbContext Db { get; } = new(new DbContextOptionsBuilder<EcommerceDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        public TokenProtector Tokens { get; } = new(Options.Create(new EcommerceOptions { TokenEncryptionKey = Convert.ToBase64String(new byte[32]) }));
        private readonly IOptions<ShopifyOptions> _shopify = Options.Create(new ShopifyOptions { ClientId = "client-id", ClientSecret = Secret, Scopes = "read_orders" });

        public StoreConnectionHandlers Handler(long? customerId = null)
        {
            var user = new Mock<ICurrentUser>();
            user.Setup(u => u.CustomerId).Returns(customerId);
            var client = new ShopifyClient(new HttpClient(new FakeShopify()), _shopify, NullLogger<ShopifyClient>.Instance);
            return new StoreConnectionHandlers(Db, user.Object, TimeProvider.System, _shopify, Tokens, client, NullLogger<StoreConnectionHandlers>.Instance);
        }

        public void Dispose() => Db.Dispose();
    }

    /// <summary>Query có chữ ký như Shopify gửi: sắp theo tên, nối k=v bằng &amp;, HMAC-SHA256 hex.</summary>
    private static List<KeyValuePair<string, string>> Signed(params (string Key, string Value)[] pairs)
    {
        var message = string.Join('&', pairs.OrderBy(p => p.Key, StringComparer.Ordinal).Select(p => $"{p.Key}={p.Value}"));
        var hmac = Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(Secret), Encoding.UTF8.GetBytes(message)));
        return [.. pairs.Select(p => new KeyValuePair<string, string>(p.Key, p.Value)), new("hmac", hmac)];
    }

    private static string Param(string url, string name) =>
        Uri.UnescapeDataString(new Uri(url).Query.TrimStart('?').Split('&').First(p => p.StartsWith(name + "=", StringComparison.Ordinal))[(name.Length + 1)..]);

    /// <summary>Mở app → nhận link OAuth → Shopify redirect về callback (chưa đăng nhập) → cookie chờ gắn shop.</summary>
    private static async Task<string> InstallAsync(Fixture f)
    {
        var launch = await f.Handler().Handle(new StartShopifyInstallCommand(Signed(("shop", Shop), ("timestamp", "1")), Host), Ct);
        var state = Param(launch.Value.RedirectUrl, "state");
        var callback = Signed(("code", "auth-code"), ("shop", Shop), ("state", state), ("timestamp", "2"));
        var outcome = await f.Handler().Handle(new CompleteShopifyConnectionCommand(callback, launch.Value.Nonce), Ct);
        Assert.Null(outcome.Error);
        return outcome.PendingInstall!;
    }

    [Fact]
    public async Task Mo_app_chua_ket_noi_thi_chuyen_ngay_sang_OAuth_cua_Shopify()
    {
        using var f = new Fixture();
        var result = await f.Handler().Handle(new StartShopifyInstallCommand(Signed(("shop", Shop), ("timestamp", "1")), Host), Ct);

        Assert.True(result.IsSuccess);
        Assert.StartsWith($"https://{Shop}/admin/oauth/authorize?client_id=client-id", result.Value.RedirectUrl);
        Assert.NotNull(result.Value.Nonce);
        Assert.Equal(OAuthState.InstallFlow, OAuthState.Unprotect(Param(result.Value.RedirectUrl, "state"), f.Tokens.Key, DateTimeOffset.UtcNow)!.CustomerId);
    }

    [Fact]
    public async Task Mo_app_sai_chu_ky_thi_tu_choi()
    {
        using var f = new Fixture();
        var query = Signed(("shop", Shop), ("timestamp", "1")).Select(p => p.Key == "shop" ? new KeyValuePair<string, string>("shop", "other.myshopify.com") : p).ToList();

        var result = await f.Handler().Handle(new StartShopifyInstallCommand(query, Host), Ct);

        Assert.Equal(StoreErrors.InvalidLaunch.Code, result.Error.Code);
    }

    [Fact]
    public async Task Shop_da_ket_noi_thi_vao_thang_portal()
    {
        using var f = new Fixture();
        var s = StoreConnection.Create(7, SalesChannelCodes.Shopify, Shop, "Demo", DateTime.Now);
        s.Authorize(new StoreAuthorization("Demo", Shop, "USD", "read_orders", f.Tokens.Protect("shpat_old"), null, null, null), DateTime.Now);
        f.Db.StoreConnections.Add(s);
        await f.Db.SaveChangesAsync(Ct);

        var result = await f.Handler().Handle(new StartShopifyInstallCommand(Signed(("shop", Shop), ("timestamp", "1")), Host), Ct);

        Assert.Equal(($"https://{Host}/ecommerce", (string?)null), (result.Value.RedirectUrl, result.Value.Nonce));
    }

    [Fact]
    public async Task Callback_khi_cai_tu_Shopify_chi_giu_token_trong_cookie_ma_hoa_chua_luu_ket_noi()
    {
        using var f = new Fixture();
        var cookie = await InstallAsync(f);

        Assert.DoesNotContain("shpat_new", cookie);
        Assert.Empty(f.Db.StoreConnections);
    }

    [Fact]
    public async Task Dang_nhap_xong_gan_shop_vao_tai_khoan_va_cai_lai_khong_tao_trung()
    {
        using var f = new Fixture();
        var claimed = await f.Handler(customerId: 7).Handle(new ClaimShopifyInstallCommand(await InstallAsync(f)), Ct);

        Assert.True(claimed.IsSuccess);
        Assert.Equal(("Demo Store", Shop, "active"), (claimed.Value.ShopName, claimed.Value.ShopDomain, claimed.Value.Status));
        var saved = await f.Db.StoreConnections.SingleAsync(Ct);
        Assert.Equal(("shpat_new", 7L), (f.Tokens.Unprotect(saved.AccessTokenEncrypted!), saved.CustomerId));

        // Gỡ rồi cài lại: cùng khách + shop → cập nhật kết nối cũ.
        saved.MarkUninstalled(DateTime.Now);
        await f.Db.SaveChangesAsync(Ct);
        var again = await f.Handler(customerId: 7).Handle(new ClaimShopifyInstallCommand(await InstallAsync(f)), Ct);
        Assert.Equal("active", again.Value.Status);
        Assert.Single(f.Db.StoreConnections);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("v1:khong-phai-base64")]
    [InlineData("v1:AAAA")]
    public async Task Cookie_thieu_hoac_hong_thi_bao_khong_co_shop_cho_ket_noi(string? cookie)
    {
        using var f = new Fixture();
        var result = await f.Handler(customerId: 7).Handle(new ClaimShopifyInstallCommand(cookie), Ct);
        Assert.Equal(StoreErrors.NoPendingInstall.Code, result.Error.Code);
    }
}
