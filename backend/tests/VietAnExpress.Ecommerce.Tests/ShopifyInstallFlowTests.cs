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

    /// <param name="revoked">Token bị Shopify thu hồi: gọi API shop trả 401.</param>
    private sealed class FakeShopify(bool revoked) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var exchange = request.RequestUri!.AbsolutePath.EndsWith("/oauth/access_token", StringComparison.Ordinal);
            if (!exchange && revoked) return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Unauthorized));
            var json = exchange
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

        public StoreConnectionHandlers Handler(long? customerId = null, bool tokenRevoked = false)
        {
            var user = new Mock<ICurrentUser>();
            user.Setup(u => u.CustomerId).Returns(customerId);
            var client = new ShopifyClient(new HttpClient(new FakeShopify(tokenRevoked)), _shopify, NullLogger<ShopifyClient>.Instance);
            return new StoreConnectionHandlers(Db, user.Object, TimeProvider.System, _shopify, Tokens, client, SyncQueue, NullLogger<StoreConnectionHandlers>.Instance);
        }

        public ShopifySyncQueue SyncQueue { get; } = new();

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

        Assert.Equal(($"https://{Host}/shopify", (string?)null), (result.Value.RedirectUrl, result.Value.Nonce));
    }

    [Fact]
    public async Task Cai_lai_ma_token_cu_bi_thu_hoi_thi_OAuth_lai()
    {
        using var f = new Fixture();
        var s = StoreConnection.Create(7, SalesChannelCodes.Shopify, Shop, "Demo", DateTime.Now);
        s.Authorize(new StoreAuthorization("Demo", Shop, "USD", "read_orders", f.Tokens.Protect("shpat_old"), null, null, null), DateTime.Now);
        f.Db.StoreConnections.Add(s);
        await f.Db.SaveChangesAsync(Ct);

        var result = await f.Handler(tokenRevoked: true).Handle(new StartShopifyInstallCommand(Signed(("shop", Shop), ("timestamp", "1")), Host), Ct);

        Assert.StartsWith($"https://{Shop}/admin/oauth/authorize?client_id=client-id", result.Value.RedirectUrl);
        Assert.NotNull(result.Value.Nonce);
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

    private static ImportedOrder Order(string id, string name) => new(id, name,
        new MarketplaceRecipient("Jane Roe", null, "+19175550100", null, "1 Main St", null, "Glen Ridge", "NJ", "07028", "US", "United States"),
        1, null, "USD", 10, null, null, null);

    [Fact]
    public async Task Ket_noi_lai_thay_don_cu_chua_gui_bang_don_dang_mo_tren_Shopify()
    {
        using var f = new Fixture();
        await f.Handler(customerId: 7).Handle(new ClaimShopifyInstallCommand(await InstallAsync(f)), Ct);
        var store = await f.Db.StoreConnections.SingleAsync(Ct);
        var pending = MarketplaceOrder.Import(7, store.Id, SalesChannelCodes.Shopify, Order("1", "#1001"), DateTime.Now);
        var confirmed = MarketplaceOrder.Import(7, store.Id, SalesChannelCodes.Shopify, Order("2", "#1002"), DateTime.Now);
        confirmed.Confirm(DateTime.Now);
        f.Db.MarketplaceOrders.AddRange(pending, confirmed);
        store.MarkUninstalled(DateTime.Now); // gỡ app rồi cài lại
        await f.Db.SaveChangesAsync(Ct);
        while (f.SyncQueue.Reader.TryRead(out _)) { }

        await f.Handler(customerId: 7).Handle(new ClaimShopifyInstallCommand(await InstallAsync(f)), Ct);

        Assert.NotNull(pending.DeletedAt); // đồng bộ lại sẽ đưa đơn còn mở trở lại với dữ liệu mới
        Assert.Null(confirmed.DeletedAt); // đơn đã xác nhận gửi giữ nguyên
        Assert.True(f.SyncQueue.Reader.TryRead(out var queued));
        Assert.Equal(Shop, queued);
    }

    [Fact]
    public async Task Shop_gan_vao_tai_khoan_khac_thi_ngat_o_tai_khoan_cu()
    {
        using var f = new Fixture();
        await f.Handler(customerId: 7).Handle(new ClaimShopifyInstallCommand(await InstallAsync(f)), Ct);
        (await f.Db.StoreConnections.SingleAsync(Ct)).MarkUninstalled(DateTime.Now);
        await f.Db.SaveChangesAsync(Ct);

        // Cài lại, đăng nhập bằng tài khoản Việt An khác.
        await f.Handler(customerId: 8).Handle(new ClaimShopifyInstallCommand(await InstallAsync(f)), Ct);

        var previous = await f.Db.StoreConnections.SingleAsync(s => s.CustomerId == 7, Ct);
        Assert.NotNull(previous.DisconnectedAt); // ẩn khỏi tab Kết nối của tài khoản cũ
        Assert.Null((await f.Db.StoreConnections.SingleAsync(s => s.CustomerId == 8, Ct)).DisconnectedAt);
    }

    [Fact]
    public async Task Shop_da_go_app_an_khoi_tab_Ket_noi_cai_lai_thi_hien_lai()
    {
        using var f = new Fixture();
        await f.Handler(customerId: 7).Handle(new ClaimShopifyInstallCommand(await InstallAsync(f)), Ct);
        (await f.Db.StoreConnections.SingleAsync(Ct)).MarkUninstalled(DateTime.Now);
        await f.Db.SaveChangesAsync(Ct);

        Assert.Empty(await f.Handler(customerId: 7).Handle(new GetStoreConnectionsQuery(), Ct));

        await f.Handler(customerId: 7).Handle(new ClaimShopifyInstallCommand(await InstallAsync(f)), Ct);
        Assert.Single(await f.Handler(customerId: 7).Handle(new GetStoreConnectionsQuery(), Ct));
    }

    [Theory]
    [InlineData("#1001", "vietan-store.myshopify.com", "VIETAN-STORE-1001")]
    [InlineData("#1001", "other-shop.myshopify.com", "OTHER-SHOP-1001")]
    [InlineData("REF-9", null, "REF-9")]
    public void Ma_in_khong_trung_giua_cac_shop(string orderName, string? shopId, string expected) =>
        Assert.Equal(expected, EcomOrderHandlers.OrderCode(orderName, shopId));

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
