using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VietAnExpress.Ecommerce.Contracts;
using VietAnExpress.Ecommerce.Domain;
using VietAnExpress.Ecommerce.Infrastructure;
using VietAnExpress.Ecommerce.Infrastructure.Shopify;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Ecommerce.Application;

/// <summary>Kết quả 1 lần đồng bộ: số đơn mở đọc được, số đơn mới thêm.</summary>
internal sealed record StoreSyncCounts(int Total, int Added);

/// <summary>
/// Kéo đơn đang mở, chưa giao của 1 shop Shopify về dbo.DonTMDT (đơn đã có thì cập nhật nếu chưa cấp bill / chưa sửa).
/// Dùng chung cho nút "Đồng bộ" (khách đang đăng nhập) và webhook orders/* (không có người dùng) — không đọc ICurrentUser.
/// </summary>
internal sealed class StoreSyncService(
    EcommerceDbContext db, TimeProvider clock, TokenProtector tokens, ShopifyClient client, ILogger<StoreSyncService> logger)
{
    private const int MaxSyncPages = 5;
    /// <summary>Làm mới access token sớm hơn hạn một chút.</summary>
    private static readonly TimeSpan RefreshMargin = TimeSpan.FromMinutes(5);

    private DateTime Now => VietnamTime.Now(clock);

    public async Task<Result<StoreSyncCounts>> SyncAsync(StoreConnection store, CancellationToken ct)
    {
        if (store.ChannelCode != SalesChannelCodes.Shopify) return StoreErrors.ChannelUnavailable(store.ChannelCode);
        if (!tokens.IsConfigured) return StoreErrors.NotConfigured;

        var accessToken = await ValidAccessTokenAsync(store, ct);
        if (accessToken is null)
        {
            store.MarkExpired(Now);
            await db.SaveChangesAsync(ct);
            return SyncErrors.NeedsReauthorize;
        }

        var (nodes, error) = await client.GetOpenOrdersAsync(store.ShopId, accessToken, MaxSyncPages, ct);
        if (error == "unauthorized")
        {
            store.MarkExpired(Now);
            await db.SaveChangesAsync(ct);
            return SyncErrors.NeedsReauthorize;
        }
        if (error is not null)
        {
            store.MarkFailed(error, Now);
            await db.SaveChangesAsync(ct);
            return SyncErrors.Failed(error);
        }

        var imported = nodes.Select(ShopifyOrderMapper.Map).Where(o => o.PlatformOrderId.Length > 0).ToList();
        var ids = imported.Select(o => o.PlatformOrderId).ToList();
        var existing = await db.MarketplaceOrders
            .Where(o => o.CustomerId == store.CustomerId).ShopifyOrdersIn(ids)
            .ToDictionaryAsync(o => o.PlatformOrderId!, ct);

        var now = Now;
        var added = 0;
        foreach (var o in imported)
        {
            // Đơn đồng bộ luôn phản ánh sàn: đơn từng bị xóa (trước khi chặn xóa đơn đồng bộ) thì hiện lại.
            if (existing.TryGetValue(o.PlatformOrderId, out var current))
            {
                if (current.DeletedAt is not null) current.Restore(o, now);
                else current.UpdateFrom(o, now);
            }
            else
            {
                db.MarketplaceOrders.Add(MarketplaceOrder.Import(store.CustomerId, store.Id, SalesChannelCodes.Shopify, o, now));
                added++;
            }
        }
        store.MarkSynced(now);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Đồng bộ Shopify {Shop}: {Total} đơn mở, {Added} đơn mới", store.ShopId, imported.Count, added);
        return new StoreSyncCounts(imported.Count, added);
    }

    /// <summary>Access token còn hạn, hoặc làm mới bằng refresh token. Null = phải ủy quyền lại.</summary>
    private async Task<string?> ValidAccessTokenAsync(StoreConnection store, CancellationToken ct)
    {
        if (store.AccessTokenEncrypted is not { } encrypted) return null;
        var now = Now;
        if (store.AccessTokenExpiresAt is not { } expires || expires - RefreshMargin > now) return tokens.Unprotect(encrypted);

        if (store.RefreshTokenEncrypted is not { } refresh || store.RefreshTokenExpiresAt < now) return null;
        var (token, error) = await client.RefreshAsync(store.ShopId, tokens.Unprotect(refresh), ct);
        if (token is null)
        {
            logger.LogWarning("Không làm mới được token Shopify của {Shop}: {Error}", store.ShopId, error);
            return null;
        }
        store.RefreshTokens(
            tokens.Protect(token.AccessToken),
            token.ExpiresIn is { } s ? now.AddSeconds(s) : null,
            token.RefreshToken is { } r ? tokens.Protect(r) : null,
            token.RefreshTokenExpiresIn is { } rs ? now.AddSeconds(rs) : null,
            now);
        await db.SaveChangesAsync(ct);
        return token.AccessToken;
    }
}
