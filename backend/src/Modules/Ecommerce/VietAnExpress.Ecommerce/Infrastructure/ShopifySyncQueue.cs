using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VietAnExpress.Ecommerce.Application;
using VietAnExpress.Ecommerce.Contracts;
using VietAnExpress.Ecommerce.Domain;

namespace VietAnExpress.Ecommerce.Infrastructure;

/// <summary>
/// Hàng đợi shop cần đồng bộ do webhook orders/* gửi tới. Webhook phải trả 200 trong 5 giây nên chỉ xếp hàng,
/// <see cref="ShopifySyncWorker"/> đồng bộ nền. Hàng đợi trong bộ nhớ: mất khi khởi động lại thì khách vẫn bấm "Đồng bộ" được.
/// </summary>
internal sealed class ShopifySyncQueue
{
    private readonly Channel<string> _channel = Channel.CreateUnbounded<string>(new UnboundedChannelOptions { SingleReader = true });

    public void Enqueue(string shop) => _channel.Writer.TryWrite(shop);

    public ChannelReader<string> Reader => _channel.Reader;
}

/// <summary>
/// Đồng bộ nền các shop có webhook đơn mới / đơn sửa. Gom webhook dồn dập trong vài giây thành 1 lần đồng bộ mỗi shop.
/// </summary>
internal sealed class ShopifySyncWorker(ShopifySyncQueue queue, IServiceScopeFactory scopes, ILogger<ShopifySyncWorker> logger) : BackgroundService
{
    /// <summary>Chờ gom các webhook cùng shop (Shopify thường gửi orders/create rồi orders/updated liền nhau).</summary>
    private static readonly TimeSpan Coalesce = TimeSpan.FromSeconds(3);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (await queue.Reader.WaitToReadAsync(stoppingToken))
        {
            await Task.Delay(Coalesce, stoppingToken);
            var shops = new HashSet<string>(StringComparer.Ordinal);
            while (queue.Reader.TryRead(out var shop)) shops.Add(shop);
            foreach (var shop in shops) await SyncShopAsync(shop, stoppingToken);
        }
    }

    private async Task SyncShopAsync(string shop, CancellationToken ct)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<EcommerceDbContext>();
            var sync = scope.ServiceProvider.GetRequiredService<StoreSyncService>();
            var stores = await db.StoreConnections
                .Where(s => s.ChannelCode == SalesChannelCodes.Shopify && s.ShopId == shop && s.DisconnectedAt == null
                    && s.Status != StoreConnection.Revoked && s.AccessTokenEncrypted != null)
                .ToListAsync(ct);
            foreach (var store in stores)
            {
                var result = await sync.SyncAsync(store, ct);
                if (result.IsFailure) logger.LogWarning("Webhook Shopify: không đồng bộ được {Shop} (kết nối {Id}): {Error}", shop, store.Id, result.Error.Message);
            }
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            logger.LogError(e, "Webhook Shopify: lỗi khi đồng bộ {Shop}", shop);
        }
    }
}
