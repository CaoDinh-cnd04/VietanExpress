using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.Ecommerce.Infrastructure;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Ecommerce.Application;

/// <summary>Xóa (ẩn) nhiều đơn E-commerce chưa gửi. Đơn đã xác nhận gửi / đã có bill / đồng bộ từ sàn được giữ lại và báo trong câu kết quả.</summary>
internal sealed record DeleteEcomOrdersCommand(IReadOnlyList<string>? Ids) : IRequest<Result<DeleteOrdersResult>>;

/// <summary>Frontend đọc thẳng <c>message</c>, <c>deletedCount</c>.</summary>
internal sealed record DeleteOrdersResult(string Message, int DeletedCount);

internal sealed class DeleteEcomOrdersHandler(EcommerceDbContext db, ICurrentUser user, TimeProvider clock) :
    IRequestHandler<DeleteEcomOrdersCommand, Result<DeleteOrdersResult>>
{
    private const int MaxPerRequest = 500;

    public async Task<Result<DeleteOrdersResult>> Handle(DeleteEcomOrdersCommand c, CancellationToken ct)
    {
        if (user.CustomerId is not { } customerId) return StoreErrors.NotLoggedIn;
        var ids = (c.Ids ?? []).Select(s => long.TryParse(s, out var id) ? id : 0).Where(id => id > 0).Distinct().ToList();
        if (ids.Count == 0) return Error.Validation("ECOM_DELETE_EMPTY", "Chọn đơn cần xóa");
        if (ids.Count > MaxPerRequest) return Error.Validation("ECOM_DELETE_TOO_MANY", $"Mỗi lần xóa tối đa {MaxPerRequest} đơn");

        var orders = await db.MarketplaceOrders.VisibleTo(user, customerId).Where(o => o.DeletedAt == null && ids.Contains(o.Id)).ToListAsync(ct);
        if (orders.Count == 0) return Error.NotFound("ECOM_ORDER_NOT_FOUND", "Không tìm thấy đơn");

        var now = VietnamTime.Now(clock);
        var synced = orders.Count(o => o.IsSynced);
        var deleted = orders.Count(o => o.Delete(now));
        await db.SaveChangesAsync(ct);

        var sent = orders.Count - deleted - synced;
        var kept = new List<string>();
        if (synced > 0) kept.Add($"{synced} đơn đồng bộ từ sàn (hủy / hoàn tất trên sàn để bỏ đơn)");
        if (sent > 0) kept.Add($"{sent} đơn đã gửi");
        var message = kept.Count == 0
            ? $"Đã xóa {deleted} đơn"
            : $"Đã xóa {deleted} đơn; giữ lại {string.Join(", ", kept)} — không xóa được";
        return new DeleteOrdersResult(message, deleted);
    }
}
