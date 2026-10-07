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

internal sealed class EcomOrderHandlers(EcommerceDbContext db, ICurrentUser user, StoreSyncService sync) :
    IRequestHandler<GetEcomOrdersQuery, IReadOnlyList<EcomOrderDto>>,
    IRequestHandler<SyncStoreCommand, Result<SyncResult>>
{
    private const int MaxListed = 500;

    public async Task<IReadOnlyList<EcomOrderDto>> Handle(GetEcomOrdersQuery q, CancellationToken ct)
    {
        if (user.CustomerId is not { } customerId) return [];
        var orders = db.MarketplaceOrders.AsNoTracking().VisibleTo(user, customerId).Where(o => o.DeletedAt == null);
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

        var result = await sync.SyncAsync(store, ct);
        if (result.IsFailure) return result.Error;
        var (total, added) = result.Value;
        var message = added > 0
            ? $"Đã nhận {added} đơn mới từ {store.ShopName}"
            : total > 0 ? $"Không có đơn mới — {total} đơn chưa giao đã có trong danh sách" : "Shop chưa có đơn nào cần giao";
        return new SyncResult(message, added);
    }

    public static EcomOrderDto ToDto(MarketplaceOrder o)
    {
        var products = OrderData.Products(o);
        return new(
            o.Id.ToString(CultureInfo.InvariantCulture), o.Source, o.OrderName, o.Bill ?? "",
            o.Recipient.Name ?? o.Recipient.Company ?? "", o.Recipient.CountryName ?? o.Recipient.CountryCode ?? "",
            o.ItemCount, o.WeightKg ?? 0, o.Status, o.Note,
            o.ProductsJson is null ? null : products,
            (o.PlacedAt ?? o.CreateDate).ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture),
            o.TotalAmount, o.Currency,
            new EcomReceiverDto(o.Recipient.Name, o.Recipient.Company, o.Recipient.Phone, o.Recipient.Email, o.Recipient.Address1, o.Recipient.Address2,
                o.Recipient.City, o.Recipient.Province, o.Recipient.PostalCode, o.Recipient.CountryCode, o.Recipient.CountryName),
            o.Service, o.Hub, o.Branch,
            OrderData.Issues(o, products), o.Bill is null,
            o.ConfirmedAt is not null, o.ConfirmedAt?.ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture));
    }
}
