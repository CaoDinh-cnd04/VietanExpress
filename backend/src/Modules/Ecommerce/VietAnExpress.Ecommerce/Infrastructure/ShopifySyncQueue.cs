using System.Collections.Concurrent;
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

    /// <summary>
    /// Mỗi lần đồng bộ kéo lại toàn bộ đơn mở của shop (tới 5 trang GraphQL) — shop bán chạy gửi webhook liên tục
    /// thì giới hạn 1 lần / 30 giây để tiết kiệm quota API Shopify và DB.
    /// </summary>
    private static readonly TimeSpan MinInterval = TimeSpan.FromSeconds(30);

    private readonly Dictionary<string, long> _lastSyncTicks = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, byte> _deferred = new(StringComparer.Ordinal);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (await queue.Reader.WaitToReadAsync(stoppingToken))
        {
            await Task.Delay(Coalesce, stoppingToken);
            var shops = new HashSet<string>(StringComparer.Ordinal);
            while (queue.Reader.TryRead(out var shop)) shops.Add(shop);
            foreach (var shop in shops)
            {
                var now = Environment.TickCount64;
                if (_lastSyncTicks.TryGetValue(shop, out var last) && TimeSpan.FromMilliseconds(now - last) is var elapsed && elapsed < MinInterval)
                {
                    Defer(shop, MinInterval - elapsed, stoppingToken);
                    continue;
                }
                _lastSyncTicks[shop] = now;
                await SyncShopAsync(shop, stoppingToken);
            }
        }
    }

    /// <summary>Hẹn đồng bộ lại shop khi hết khoảng chờ — mỗi shop chỉ 1 lịch hẹn, webhook trong lúc chờ gộp vào lần đó.</summary>
    private void Defer(string shop, TimeSpan wait, CancellationToken ct)
    {
        if (!_deferred.TryAdd(shop, 0)) return;
        _ = Task.Run(async () =>
        {
            try { await Task.Delay(wait, ct); }
            catch (OperationCanceledException) { return; }
            finally { _deferred.TryRemove(shop, out _); }
            queue.Enqueue(shop);
        }, CancellationToken.None);
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
