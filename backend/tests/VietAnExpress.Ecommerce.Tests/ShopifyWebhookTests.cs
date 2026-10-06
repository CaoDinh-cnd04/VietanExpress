using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using VietAnExpress.Ecommerce.Application;
using VietAnExpress.Ecommerce.Domain;
using VietAnExpress.Ecommerce.Infrastructure;
using VietAnExpress.Ecommerce.Infrastructure.Shopify;
using Xunit;

namespace VietAnExpress.Ecommerce.Tests;

public class ShopifyWebhookHmacTests
{
    private const string Secret = "shpss_test_secret";

    private static string Sign(string body, string secret = Secret) =>
        Convert.ToBase64String(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(body)));

    [Fact]
    public void Chu_ky_dung_thi_hop_le()
    {
        const string body = """{"shop_domain":"abc.myshopify.com"}""";
        Assert.True(ShopifyWebhook.IsValidHmac(Encoding.UTF8.GetBytes(body), Sign(body), Secret));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("khong-phai-base64!!")]
    [InlineData("c2hvcnQ=")] // base64 hợp lệ nhưng không đủ 32 byte
    public void Thieu_hoac_sai_dinh_dang_chu_ky_thi_tu_choi(string? header) =>
        Assert.False(ShopifyWebhook.IsValidHmac("{}"u8, header, Secret));

    [Fact]
    public void Body_bi_sua_hoac_sai_secret_thi_tu_choi()
    {
        const string body = """{"id":1}""";
        Assert.False(ShopifyWebhook.IsValidHmac(Encoding.UTF8.GetBytes("""{"id":2}"""), Sign(body), Secret));
        Assert.False(ShopifyWebhook.IsValidHmac(Encoding.UTF8.GetBytes(body), Sign(body, "secret-khac"), Secret));
        Assert.False(ShopifyWebhook.IsValidHmac(Encoding.UTF8.GetBytes(body), Sign(body), ""));
    }

    [Fact]
    public void Doc_payload_compliance_lay_ma_don_dang_so()
    {
        var redact = ShopifyWebhook.ParseCompliance("""
            {"shop_id":954889,"shop_domain":"abc.myshopify.com","customer":{"id":191167,"email":"john@example.com"},
             "orders_to_redact":[299938,"gid://shopify/Order/280263"]}
            """u8);
        Assert.Equal(("abc.myshopify.com", "191167"), (redact.ShopDomain, redact.CustomerId));
        Assert.Equal(["299938", "280263"], redact.OrderIds);

        var request = ShopifyWebhook.ParseCompliance("""{"customer":{"id":1},"orders_requested":[11,22]}"""u8);
        Assert.Equal(["11", "22"], request.OrderIds);

        Assert.Empty(ShopifyWebhook.ParseCompliance("{bad"u8).OrderIds);
    }
}

public class ShopifyWebhookHandlerTests
{
    private const string Shop = "abc.myshopify.com";
    private static readonly DateTime Now = new(2026, 10, 6, 9, 0, 0);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private sealed class Fixture : IDisposable
    {
        public EcommerceDbContext Db { get; } = new(new DbContextOptionsBuilder<EcommerceDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        public ShopifySyncQueue Queue { get; } = new();
        public MemoryCache Cache { get; } = new(new MemoryCacheOptions());
        public ShopifyWebhookHandler Handler => new(Db, Queue, Cache, TimeProvider.System, NullLogger<ShopifyWebhookHandler>.Instance);

        public StoreConnection AddStore(long customerId, string shop = Shop)
        {
            var s = StoreConnection.Create(customerId, "shopify", shop, "Shop", Now);
            s.Authorize(new StoreAuthorization("Shop", shop, "USD", "read_orders", "enc-access", null, "enc-refresh", null), Now);
            Db.StoreConnections.Add(s);
            Db.SaveChanges();
            return s;
        }

        public MarketplaceOrder AddOrder(long customerId, long? storeId, string platformId)
        {
            var recipient = new MarketplaceRecipient("John", null, "+1 555", "john@example.com", "1 Main St", null, "NYC", "NY", "10001", "US", "United States");
            var o = MarketplaceOrder.Import(customerId, storeId, "shopify",
                new ImportedOrder(platformId, "#" + platformId, recipient, 1, 1, "USD", 10, null, "Giao giờ hành chính", Now), Now);
            Db.MarketplaceOrders.Add(o);
            Db.SaveChanges();
            return o;
        }

        public void Dispose()
        {
            Db.Dispose();
            Cache.Dispose();
        }
    }

    private static ReceiveShopifyWebhookCommand Webhook(string topic, string body = "{}", string? id = null) =>
        new(topic, Shop, id ?? Guid.NewGuid().ToString(), Encoding.UTF8.GetBytes(body));

    [Fact]
    public async Task Go_app_thi_ket_noi_chuyen_revoked_va_xoa_token()
    {
        using var f = new Fixture();
        var store = f.AddStore(1);
        var other = f.AddStore(2, "khac.myshopify.com");

        var outcome = await f.Handler.Handle(Webhook(ShopifyTopics.AppUninstalled), Ct);

        Assert.Equal(1, outcome.Affected);
        Assert.Equal((StoreConnection.Revoked, null, null), (store.Status, store.AccessTokenEncrypted, store.RefreshTokenEncrypted));
        Assert.Null(store.DisconnectedAt); // vẫn hiện để khách ủy quyền lại
        Assert.Equal(StoreConnection.Active, other.Status);
    }

    [Fact]
    public async Task Customers_redact_chi_xoa_du_lieu_nguoi_mua_cua_don_duoc_liet_ke()
    {
        using var f = new Fixture();
        var store = f.AddStore(1);
        var listed = f.AddOrder(1, store.Id, "299938");
        var fromCsv = f.AddOrder(1, null, "280263");   // nhập từ file export của shop
        var kept = f.AddOrder(1, store.Id, "111111");
        var otherCustomer = f.AddOrder(9, null, "299938"); // khách khác không kết nối shop này

        var outcome = await f.Handler.Handle(Webhook(ShopifyTopics.CustomersRedact,
            """{"shop_domain":"abc.myshopify.com","customer":{"id":1},"orders_to_redact":[299938,280263]}"""), Ct);

        Assert.Equal(2, outcome.Affected);
        Assert.Equal(MarketplaceRecipient.Empty, listed.Recipient);
        Assert.Null(listed.Note);
        Assert.Equal(MarketplaceRecipient.Empty, fromCsv.Recipient);
        Assert.Equal("John", kept.Recipient.Name);
        Assert.Equal("John", otherCustomer.Recipient.Name);
        Assert.Equal(10, listed.TotalAmount); // giữ số tiền / sản phẩm để đối soát
    }

    [Fact]
    public async Task Shop_redact_xoa_du_lieu_moi_don_cua_shop()
    {
        using var f = new Fixture();
        var store = f.AddStore(1);
        var a = f.AddOrder(1, store.Id, "1");
        var b = f.AddOrder(1, store.Id, "2");

        var outcome = await f.Handler.Handle(Webhook(ShopifyTopics.ShopRedact, """{"shop_domain":"abc.myshopify.com"}"""), Ct);

        Assert.Equal(2, outcome.Affected);
        Assert.All([a, b], o => Assert.Equal(MarketplaceRecipient.Empty, o.Recipient));
        Assert.Null(store.AccessTokenEncrypted);
    }

    [Fact]
    public async Task Data_request_chi_ghi_nhan_khong_sua_du_lieu()
    {
        using var f = new Fixture();
        var store = f.AddStore(1);
        var o = f.AddOrder(1, store.Id, "77");

        var outcome = await f.Handler.Handle(Webhook(ShopifyTopics.CustomersDataRequest, """{"customer":{"id":5},"orders_requested":[77]}"""), Ct);

        Assert.Equal(("data-request-logged", 1), (outcome.Action, outcome.Affected));
        Assert.Equal("John", o.Recipient.Name);
    }

    [Fact]
    public async Task Don_moi_xep_hang_dong_bo_va_webhook_trung_bi_bo_qua()
    {
        using var f = new Fixture();

        Assert.Equal("sync-queued", (await f.Handler.Handle(Webhook(ShopifyTopics.OrdersCreate, id: "w-1"), Ct)).Action);
        Assert.Equal("duplicate", (await f.Handler.Handle(Webhook(ShopifyTopics.OrdersCreate, id: "w-1"), Ct)).Action);

        Assert.True(f.Queue.Reader.TryRead(out var shop));
        Assert.Equal(Shop, shop);
        Assert.False(f.Queue.Reader.TryRead(out _));
    }
}
