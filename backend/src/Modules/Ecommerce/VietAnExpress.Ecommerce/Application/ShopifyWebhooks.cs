using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using VietAnExpress.Ecommerce.Contracts;
using VietAnExpress.Ecommerce.Infrastructure;
using VietAnExpress.Ecommerce.Infrastructure.Shopify;
using VietAnExpress.SharedKernel.Application;

namespace VietAnExpress.Ecommerce.Application;

/// <summary>Webhook Shopify đã qua kiểm chữ ký HMAC (controller kiểm trước khi gửi command).</summary>
/// <param name="Shop">X-Shopify-Shop-Domain đã chuẩn hóa (xxx.myshopify.com).</param>
/// <param name="WebhookId">X-Shopify-Webhook-Id — chống xử lý trùng khi Shopify gửi lại.</param>
internal sealed record ReceiveShopifyWebhookCommand(string Topic, string Shop, string? WebhookId, byte[] Body) : IRequest<WebhookOutcome>;

/// <summary>Kết quả xử lý (để log / test) — controller luôn trả 200 khi chữ ký đúng.</summary>
internal sealed record WebhookOutcome(string Action, int Affected = 0);

/// <summary>
/// Xử lý webhook Shopify (docs/ECOM_INTEGRATION.md §1):
/// orders/create, orders/updated → xếp hàng đồng bộ nền; app/uninstalled → kết nối "revoked", xóa token;
/// customers/data_request → ghi log để Việt An gửi dữ liệu cho chủ shop; customers/redact, shop/redact → xóa dữ liệu cá nhân người mua.
/// Mọi thao tác idempotent: nhận lại cùng webhook không gây sai dữ liệu.
/// </summary>
internal sealed class ShopifyWebhookHandler(
    EcommerceDbContext db, ShopifySyncQueue queue, IMemoryCache cache, TimeProvider clock, ILogger<ShopifyWebhookHandler> logger)
    : IRequestHandler<ReceiveShopifyWebhookCommand, WebhookOutcome>
{
    private static readonly TimeSpan DedupWindow = TimeSpan.FromHours(24);

    private DateTime Now => VietnamTime.Now(clock);

    public async Task<WebhookOutcome> Handle(ReceiveShopifyWebhookCommand c, CancellationToken ct)
    {
        if (c.WebhookId is { Length: > 0 } id)
        {
            var key = $"shopify-webhook:{id}";
            if (cache.TryGetValue(key, out _)) return new WebhookOutcome("duplicate");
            cache.Set(key, true, DedupWindow);
        }

        return c.Topic switch
        {
            ShopifyTopics.OrdersCreate or ShopifyTopics.OrdersUpdated => QueueSync(c.Shop),
            ShopifyTopics.AppUninstalled => await UninstalledAsync(c.Shop, ct),
            ShopifyTopics.CustomersDataRequest => await DataRequestAsync(c, ct),
            ShopifyTopics.CustomersRedact => await RedactCustomerAsync(c, ct),
            ShopifyTopics.ShopRedact => await RedactShopAsync(c.Shop, ct),
            _ => Ignored(c.Topic, c.Shop)
        };
    }

    private WebhookOutcome QueueSync(string shop)
    {
        queue.Enqueue(shop);
        return new WebhookOutcome("sync-queued");
    }

    private async Task<WebhookOutcome> UninstalledAsync(string shop, CancellationToken ct)
    {
        var connections = await ShopConnections(shop).Where(s => s.DisconnectedAt == null).ToListAsync(ct);
        var now = Now;
        foreach (var s in connections) s.MarkUninstalled(now);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Shopify {Shop} đã gỡ app — {Count} kết nối chuyển revoked", shop, connections.Count);
        return new WebhookOutcome("uninstalled", connections.Count);
    }

    /// <summary>
    /// Chủ shop yêu cầu dữ liệu của 1 người mua. Việt An phải gửi cho chủ shop trong 30 ngày —
    /// ghi log cảnh báo (kèm số đơn đang lưu) để nhân viên xử lý; không trả dữ liệu qua webhook.
    /// </summary>
    private async Task<WebhookOutcome> DataRequestAsync(ReceiveShopifyWebhookCommand c, CancellationToken ct)
    {
        var p = ShopifyWebhook.ParseCompliance(c.Body);
        var held = p.OrderIds.Count == 0 ? 0 : await OrdersOf(c.Shop, p.OrderIds).CountAsync(ct);
        logger.LogWarning(
            "Shopify customers/data_request: shop {Shop}, người mua {Customer}, đơn {Orders} — đang lưu {Held} đơn. Gửi dữ liệu cho chủ shop trong 30 ngày.",
            c.Shop, p.CustomerId, string.Join(',', p.OrderIds), held);
        return new WebhookOutcome("data-request-logged", held);
    }

    /// <summary>Xóa dữ liệu cá nhân của người mua trong các đơn Shopify được liệt kê (cả đơn nhập từ file export của shop đó).</summary>
    private async Task<WebhookOutcome> RedactCustomerAsync(ReceiveShopifyWebhookCommand c, CancellationToken ct)
    {
        var p = ShopifyWebhook.ParseCompliance(c.Body);
        if (p.OrderIds.Count == 0) return new WebhookOutcome("redact-customer", 0);
        var orders = await OrdersOf(c.Shop, p.OrderIds).ToListAsync(ct);
        var now = Now;
        foreach (var o in orders) o.RedactPersonalData(now);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Shopify customers/redact {Shop}: đã xóa dữ liệu người mua ở {Count} đơn", c.Shop, orders.Count);
        return new WebhookOutcome("redact-customer", orders.Count);
    }

    /// <summary>48 giờ sau khi gỡ app: xóa dữ liệu người mua của mọi đơn nhận qua kết nối shop này và token còn sót.</summary>
    private async Task<WebhookOutcome> RedactShopAsync(string shop, CancellationToken ct)
    {
        var connections = await ShopConnections(shop).ToListAsync(ct);
        var ids = connections.Select(s => (long?)s.Id).ToList();
        var orders = await db.MarketplaceOrders.Where(o => ids.Contains(o.StoreConnectionId)).ToListAsync(ct);
        var now = Now;
        foreach (var o in orders) o.RedactPersonalData(now);
        foreach (var s in connections.Where(s => s.AccessTokenEncrypted is not null || s.RefreshTokenEncrypted is not null)) s.MarkUninstalled(now);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Shopify shop/redact {Shop}: đã xóa dữ liệu người mua ở {Count} đơn", shop, orders.Count);
        return new WebhookOutcome("redact-shop", orders.Count);
    }

    private WebhookOutcome Ignored(string topic, string shop)
    {
        logger.LogInformation("Bỏ qua webhook Shopify {Topic} từ {Shop}", topic, shop);
        return new WebhookOutcome("ignored");
    }

    /// <summary>Đơn Shopify (theo mã đơn trên sàn) của các khách đã kết nối shop này — gồm cả đơn nhập từ file export của shop.</summary>
    private IQueryable<Domain.MarketplaceOrder> OrdersOf(string shop, IReadOnlyCollection<string> platformOrderIds) =>
        db.MarketplaceOrders
            .Where(o => ShopConnections(shop).Any(s => s.CustomerId == o.CustomerId))
            .ShopifyOrdersIn(platformOrderIds);

    private IQueryable<Domain.StoreConnection> ShopConnections(string shop) =>
        db.StoreConnections.Where(s => s.ChannelCode == SalesChannelCodes.Shopify && s.ShopId == shop);
}
