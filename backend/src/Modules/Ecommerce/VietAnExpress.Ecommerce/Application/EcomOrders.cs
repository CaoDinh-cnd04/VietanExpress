using System.Globalization;
using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VietAnExpress.Ecommerce.Contracts;
using VietAnExpress.Ecommerce.Domain;
using VietAnExpress.Ecommerce.Infrastructure;
using VietAnExpress.Ecommerce.Infrastructure.Shopify;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Ecommerce.Application;

/// <summary>Khớp <c>EcomOrder</c> của frontend (API_CONTRACT.md §5).</summary>
internal sealed record EcomOrderDto(
    string Id, string Src, string Ref, string Bill, string Cnee, string Ct, int Items, decimal Kg, string St,
    string? Note, IReadOnlyList<EcomProductDto>? Products, string CreatedAt,
    decimal? Value, string? Currency, EcomReceiverDto Receiver, string? Service, string? Hub, string? Branch,
    IReadOnlyList<string> Issues, bool Editable, bool Confirmed, string? ConfirmedAt);

/// <summary>Người nhận đầy đủ cho ngăn chi tiết đơn.</summary>
internal sealed record EcomReceiverDto(
    string? Name, string? Company, string? Phone, string? Email, string? Address1, string? Address2,
    string? City, string? State, string? Postal, string? CountryCode, string? Country);

/// <param name="Source">shopify / tiktok / … — trống = mọi nguồn.</param>
/// <param name="Search">Tìm theo mã đơn, người nhận, bill.</param>
/// <param name="Scope">"inbox" = tab Đơn hàng (chưa xác nhận), "mine" = Đơn hàng của tôi (đã xác nhận gửi), trống = tất cả.</param>
internal sealed record GetEcomOrdersQuery(string? Source, string? Search, string? Scope = null) : IRequest<IReadOnlyList<EcomOrderDto>>;

internal sealed record SyncStoreCommand(long StoreId) : IRequest<Result<SyncResult>>;

/// <summary>Frontend đọc thẳng <c>message</c>, <c>importedCount</c> (không bọc trong data).</summary>
internal sealed record SyncResult(string Message, int ImportedCount);

internal static class SyncErrors
{
    public static readonly Error NeedsReauthorize = Error.BusinessRule("ECOM_REAUTHORIZE", "Kết nối Shopify đã hết hạn, vui lòng bấm Ủy quyền lại");
    public static Error Failed(string detail) => Error.BusinessRule("ECOM_SYNC_FAILED", $"Không đồng bộ được đơn từ Shopify: {detail}");
}

internal sealed class EcomOrderHandlers(
    EcommerceDbContext db,
    ICurrentUser user,
    TimeProvider clock,
    TokenProtector tokens,
    ShopifyClient client,
    ILogger<EcomOrderHandlers> logger) :
    IRequestHandler<GetEcomOrdersQuery, IReadOnlyList<EcomOrderDto>>,
    IRequestHandler<SyncStoreCommand, Result<SyncResult>>
{
    private const int MaxListed = 500;
    private const int MaxSyncPages = 5;
    /// <summary>Làm mới access token sớm hơn hạn một chút.</summary>
    private static readonly TimeSpan RefreshMargin = TimeSpan.FromMinutes(5);

    private DateTime Now => VietnamTime.ToVietnam(clock.GetUtcNow()).DateTime;

    public async Task<IReadOnlyList<EcomOrderDto>> Handle(GetEcomOrdersQuery q, CancellationToken ct)
    {
        if (user.CustomerId is not { } customerId) return [];
        var orders = db.MarketplaceOrders.AsNoTracking().Where(o => o.CustomerId == customerId && o.DeletedAt == null);
        if (!string.IsNullOrWhiteSpace(q.Source)) orders = orders.Where(o => o.Source == q.Source);
        if (q.Scope == "inbox") orders = orders.Where(o => o.ConfirmedAt == null);
        else if (q.Scope == "mine") orders = orders.Where(o => o.ConfirmedAt != null);
        if (q.Search?.Trim() is { Length: > 0 } s)
            orders = orders.Where(o => o.OrderName.Contains(s) || (o.Bill != null && o.Bill.Contains(s)) || (o.Recipient.Name != null && o.Recipient.Name.Contains(s)));

        var rows = await orders.OrderByDescending(o => o.PlacedAt ?? o.CreateDate).Take(MaxListed).ToListAsync(ct);
        return [.. rows.Select(ToDto)];
    }

    public async Task<Result<SyncResult>> Handle(SyncStoreCommand c, CancellationToken ct)
    {
        if (user.CustomerId is not { } customerId) return StoreErrors.NotLoggedIn;
        var store = await db.StoreConnections.FirstOrDefaultAsync(s => s.Id == c.StoreId && s.CustomerId == customerId && s.DisconnectedAt == null, ct);
        if (store is null) return StoreErrors.NotFound;
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
            .Where(o => o.CustomerId == customerId && o.Source == SalesChannelCodes.Shopify && o.PlatformOrderId != null && ids.Contains(o.PlatformOrderId))
            .ToDictionaryAsync(o => o.PlatformOrderId!, ct);

        var now = Now;
        var added = 0;
        foreach (var o in imported)
        {
            if (existing.TryGetValue(o.PlatformOrderId, out var current)) current.UpdateFrom(o, now);
            else
            {
                db.MarketplaceOrders.Add(MarketplaceOrder.Import(customerId, store.Id, SalesChannelCodes.Shopify, o, now));
                added++;
            }
        }
        store.MarkSynced(now);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Đồng bộ Shopify {Shop}: {Total} đơn mở, {Added} đơn mới", store.ShopId, imported.Count, added);
        var message = added > 0
            ? $"Đã nhận {added} đơn mới từ {store.ShopName}"
            : imported.Count > 0 ? $"Không có đơn mới — {imported.Count} đơn chưa giao đã có trong danh sách" : "Shop chưa có đơn nào cần giao";
        return new SyncResult(message, added);
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

    public static EcomOrderDto ToDto(MarketplaceOrder o) => new(
        o.Id.ToString(CultureInfo.InvariantCulture), o.Source, o.OrderName, o.Bill ?? "",
        o.Recipient.Name ?? o.Recipient.Company ?? "", o.Recipient.CountryName ?? o.Recipient.CountryCode ?? "",
        o.ItemCount, o.WeightKg ?? 0, o.Status, o.Note,
        o.ProductsJson is null ? null : OrderData.Products(o),
        (o.PlacedAt ?? o.CreateDate).ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture),
        o.TotalAmount, o.Currency,
        new EcomReceiverDto(o.Recipient.Name, o.Recipient.Company, o.Recipient.Phone, o.Recipient.Email, o.Recipient.Address1, o.Recipient.Address2,
            o.Recipient.City, o.Recipient.Province, o.Recipient.PostalCode, o.Recipient.CountryCode, o.Recipient.CountryName),
        o.Service, o.Hub, o.Branch,
        OrderData.Issues(o), o.Bill is null,
        o.ConfirmedAt is not null, o.ConfirmedAt?.ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture));
}
