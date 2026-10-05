using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VietAnExpress.Ecommerce.Contracts;
using VietAnExpress.Ecommerce.Domain;
using VietAnExpress.Ecommerce.Infrastructure;
using VietAnExpress.Ecommerce.Infrastructure.Shopify;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Ecommerce.Application;

/// <summary>Khớp <c>StoreConnection</c> của frontend (API_CONTRACT.md §5.1). Không bao giờ chứa token.</summary>
internal sealed record StoreConnectionDto(
    string Id, string Platform, string ShopName, string? ShopDomain, string? Region, string Status,
    DateTimeOffset ConnectedAt, DateTimeOffset? LastSyncAt, string? LastError);

internal sealed record GetStoreConnectionsQuery : IRequest<IReadOnlyList<StoreConnectionDto>>;

/// <param name="PortalHost">Domain portal đã kiểm bằng <see cref="PortalHosts"/>.</param>
internal sealed record StartStoreConnectionCommand(string? Platform, string? ShopDomain, string PortalHost) : IRequest<Result<StartedConnection>>;

/// <param name="Nonce">Đặt vào cookie <see cref="OAuthState.CookieName"/>.</param>
internal sealed record StartedConnection(string AuthorizeUrl, string Nonce);

/// <summary>Shopify redirect về — không có phiên đăng nhập (cookie SameSite=Strict), khách lấy từ state đã ký.</summary>
internal sealed record CompleteShopifyConnectionCommand(IReadOnlyList<KeyValuePair<string, string>> Query, string? CookieNonce) : IRequest<CallbackOutcome>;

/// <param name="Error">Null = thành công; ngược lại là câu tiếng Việt hiện cho khách.</param>
internal sealed record CallbackOutcome(string? PortalHost, string? Error);

internal sealed record DisconnectStoreCommand(long Id) : IRequest<Result>;

internal static class StoreErrors
{
    public static readonly Error NotLoggedIn = Error.Unauthorized("AUTH_REQUIRED", "Vui lòng đăng nhập");
    public static readonly Error InvalidShop = Error.Validation("ECOM_SHOP_INVALID", "Nhập dạng ten-shop hoặc ten-shop.myshopify.com");
    public static readonly Error NotConfigured = Error.BusinessRule("ECOM_NOT_CONFIGURED", "Máy chủ chưa cấu hình kết nối Shopify, vui lòng báo Việt An");
    public static readonly Error NotFound = Error.NotFound("ECOM_STORE_NOT_FOUND", "Không tìm thấy cửa hàng");
    public static Error ChannelUnavailable(string name) => Error.BusinessRule("ECOM_CHANNEL_UNAVAILABLE", $"Chưa hỗ trợ kết nối {name}, Việt An đang hoàn thiện");

    public const string Expired = "Phiên kết nối đã hết hạn, vui lòng bấm Kết nối lại";
    public const string Rejected = "Shopify không xác nhận được yêu cầu kết nối";
}

internal sealed class StoreConnectionHandlers(
    EcommerceDbContext db,
    ICurrentUser user,
    TimeProvider clock,
    IOptions<ShopifyOptions> shopify,
    TokenProtector tokens,
    ShopifyClient client,
    ILogger<StoreConnectionHandlers> logger) :
    IRequestHandler<GetStoreConnectionsQuery, IReadOnlyList<StoreConnectionDto>>,
    IRequestHandler<StartStoreConnectionCommand, Result<StartedConnection>>,
    IRequestHandler<CompleteShopifyConnectionCommand, CallbackOutcome>,
    IRequestHandler<DisconnectStoreCommand, Result>
{
    private DateTime Now => VietnamTime.ToVietnam(clock.GetUtcNow()).DateTime;

    public async Task<IReadOnlyList<StoreConnectionDto>> Handle(GetStoreConnectionsQuery q, CancellationToken ct)
    {
        if (user.CustomerId is not { } customerId) return [];
        var rows = await db.StoreConnections.AsNoTracking()
            .Where(s => s.CustomerId == customerId && s.DisconnectedAt == null)
            .OrderBy(s => s.ConnectedAt)
            .ToListAsync(ct);
        return [.. rows.Select(ToDto)];
    }

    public async Task<Result<StartedConnection>> Handle(StartStoreConnectionCommand c, CancellationToken ct)
    {
        if (user.CustomerId is not { } customerId) return StoreErrors.NotLoggedIn;
        var code = c.Platform?.Trim().ToLowerInvariant();
        var channel = await db.SalesChannels.AsNoTracking().FirstOrDefaultAsync(x => x.Code == code, ct);
        if (channel is null) return Error.Validation("ECOM_CHANNEL_INVALID", "Kênh bán không hợp lệ");
        // Kênh mới bật Dang_Hoat_Dong trong dbo.KenhTMDT khi đã có adapter — hiện chỉ Shopify.
        if (!channel.IsActive || channel.Code != SalesChannelCodes.Shopify) return StoreErrors.ChannelUnavailable(channel.Name);

        var o = shopify.Value;
        if (!o.IsConfigured || !tokens.IsConfigured) return StoreErrors.NotConfigured;
        if (ShopifyOAuth.NormalizeShop(c.ShopDomain) is not { } shop) return StoreErrors.InvalidShop;

        var nonce = OAuthState.NewNonce();
        var state = OAuthState.Protect(
            new OAuthStatePayload(customerId, channel.Code, shop, c.PortalHost, clock.GetUtcNow() + OAuthState.Lifetime, nonce), tokens.Key);
        var url = ShopifyOAuth.AuthorizeUrl(shop, o.ClientId, o.Scopes, PortalHosts.Url(c.PortalHost, o.CallbackPath), state);
        return new StartedConnection(url, nonce);
    }

    public async Task<CallbackOutcome> Handle(CompleteShopifyConnectionCommand c, CancellationToken ct)
    {
        string? Param(string name) => c.Query.FirstOrDefault(p => p.Key == name).Value;

        var o = shopify.Value;
        if (!o.IsConfigured || !tokens.IsConfigured) return new(null, StoreErrors.NotConfigured.Message);

        var state = OAuthState.Unprotect(Param("state"), tokens.Key, clock.GetUtcNow());
        if (state is null || state.Nonce != c.CookieNonce) return new(state?.PortalHost, StoreErrors.Expired);

        // Lý do cụ thể nằm trong câu báo lỗi để khách / Việt An biết bước nào hỏng (không lộ secret hay code).
        var shop = ShopifyOAuth.NormalizeShop(Param("shop"));
        var shopifyError = Param("error_description") ?? Param("error");
        var reason = shopifyError is not null ? $"Shopify báo: {shopifyError}"
            : shop != state.Shop ? $"cửa hàng trả về ({Param("shop")}) khác cửa hàng đã chọn ({state.Shop})"
            : !ShopifyOAuth.IsValidHmac(c.Query, o.ClientSecret) ? "sai chữ ký HMAC — kiểm tra Shopify__ClientSecret trên máy chủ"
            : Param("code") is not { Length: > 0 } ? "thiếu mã ủy quyền (code)"
            : null;
        if (reason is not null || shop is null)
        {
            logger.LogWarning("Callback Shopify không hợp lệ cho khách {CustomerId}: {Reason}; tham số: {Keys}",
                state.CustomerId, reason, string.Join(',', c.Query.Select(p => p.Key)));
            return new(state.PortalHost, $"{StoreErrors.Rejected}: {reason}");
        }

        var (token, exchangeError) = await client.ExchangeCodeAsync(shop, Param("code")!, ct);
        if (token is null) return new(state.PortalHost, $"{StoreErrors.Rejected}: đổi mã lấy token thất bại — {exchangeError}");
        var info = await client.GetShopAsync(shop, token.AccessToken, ct);

        var now = Now;
        var connection = await db.StoreConnections.FirstOrDefaultAsync(
            s => s.CustomerId == state.CustomerId && s.ChannelCode == SalesChannelCodes.Shopify && s.ShopId == shop, ct);
        if (connection is null)
        {
            connection = StoreConnection.Create(state.CustomerId, SalesChannelCodes.Shopify, shop, info?.Name ?? shop, now);
            db.StoreConnections.Add(connection);
        }
        connection.Authorize(new StoreAuthorization(
            Truncate(info?.Name ?? shop, StoreConnection.ShopNameMaxLength),
            shop,
            info?.Currency is { Length: StoreConnection.CurrencyMaxLength } currency ? currency : null,
            Truncate(token.Scopes, StoreConnection.ScopesMaxLength),
            tokens.Protect(token.AccessToken),
            token.ExpiresIn is { } s ? now.AddSeconds(s) : null,
            token.RefreshToken is { } refresh ? tokens.Protect(refresh) : null,
            token.RefreshTokenExpiresIn is { } r ? now.AddSeconds(r) : null), now);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Khách {CustomerId} đã kết nối Shopify {Shop}", state.CustomerId, shop);
        return new(state.PortalHost, null);
    }

    public async Task<Result> Handle(DisconnectStoreCommand c, CancellationToken ct)
    {
        if (user.CustomerId is not { } customerId) return StoreErrors.NotLoggedIn;
        var connection = await db.StoreConnections.FirstOrDefaultAsync(s => s.Id == c.Id && s.CustomerId == customerId && s.DisconnectedAt == null, ct);
        if (connection is null) return StoreErrors.NotFound;

        if (connection.ChannelCode == SalesChannelCodes.Shopify && connection.AccessTokenEncrypted is { } encrypted && tokens.IsConfigured)
            await client.RevokeAsync(connection.ShopId, tokens.Unprotect(encrypted), ct);

        connection.Disconnect(Now);
        await db.SaveChangesAsync(ct);
        return Result.Success();
    }

    private static StoreConnectionDto ToDto(StoreConnection s) => new(
        s.Id.ToString(System.Globalization.CultureInfo.InvariantCulture), s.ChannelCode, s.ShopName, s.ShopDomain ?? s.ShopId, s.Region, s.Status,
        AsVietnam(s.ConnectedAt), s.LastSyncAt is { } sync ? AsVietnam(sync) : null, s.LastError);

    /// <summary>Cột datetime lưu giờ Việt Nam (như bảng cũ) → trả ISO kèm +07:00.</summary>
    private static DateTimeOffset AsVietnam(DateTime local) => new(DateTime.SpecifyKind(local, DateTimeKind.Unspecified), TimeSpan.FromHours(7));

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max];
}
