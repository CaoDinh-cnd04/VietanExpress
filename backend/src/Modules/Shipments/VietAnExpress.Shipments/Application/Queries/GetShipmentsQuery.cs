using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.Customers.Contracts;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Persistence;
using VietAnExpress.SharedKernel.Results;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Domain;
using VietAnExpress.Shipments.Infrastructure;

namespace VietAnExpress.Shipments.Application.Queries;

/// <param name="Search">Tìm theo mã vận đơn, số tham chiếu, tên người nhận.</param>
/// <param name="FromDate">Ngày tạo từ (theo giờ Việt Nam, tính cả ngày).</param>
/// <param name="ToDate">Ngày tạo đến (theo giờ Việt Nam, tính cả ngày).</param>
internal sealed record GetShipmentsQuery(
    string? Search,
    ShipmentStatus? Status,
    Guid? CustomerId,
    DateOnly? FromDate,
    DateOnly? ToDate,
    int? Page,
    int? PageSize) : IRequest<Result<PagedResult<ShipmentListItemDto>>>;

internal sealed class GetShipmentsHandler(ShipmentsDbContext db, ICustomersApi customers, ICurrentUser user)
    : IRequestHandler<GetShipmentsQuery, Result<PagedResult<ShipmentListItemDto>>>
{
    public async Task<Result<PagedResult<ShipmentListItemDto>>> Handle(GetShipmentsQuery q, CancellationToken ct)
    {
        var query = db.Shipments.AsNoTracking().VisibleTo(user);

        if (q.Search.ToLikePattern() is { } like)
            query = query.Where(s =>
                (s.Code != null && EF.Functions.Like(s.Code, like)) ||
                (s.CustomerReference != null && EF.Functions.Like(s.CustomerReference, like)) ||
                EF.Functions.Like(s.Receiver.ContactName, like) ||
                (s.Receiver.CompanyName != null && EF.Functions.Like(s.Receiver.CompanyName, like)));

        if (q.Status is { } status) query = query.Where(s => s.Status == status);
        if (q.CustomerId is { } customerId) query = query.Where(s => s.CustomerId == customerId);
        if (q.FromDate is { } from)
        {
            var fromUtc = VietnamTime.StartOfDayUtc(from);
            query = query.Where(s => s.CreatedAt >= fromUtc);
        }
        if (q.ToDate is { } to)
        {
            var toUtc = VietnamTime.StartOfDayUtc(to.AddDays(1));
            query = query.Where(s => s.CreatedAt < toUtc);
        }

        var page = await query
            .OrderByDescending(s => s.CreatedAt).ThenByDescending(s => s.Id)
            .Select(s => new ShipmentListItemDto(
                s.Id, s.Code, s.CustomerId, null, s.CustomerReference, s.Status, s.ServiceCode,
                s.Receiver.ContactName, s.Receiver.City, s.Receiver.CountryCode,
                s.TotalPieces, s.ChargeableWeightKg, s.CreatedAt, s.BillIssuedAt))
            .ToPagedResultAsync(q.Page, q.PageSize, ct);

        // Gắn tên khách: 1 lần gọi cho cả trang qua Customers.Contracts (không join bảng xuyên module).
        var names = await customers.GetByIdsAsync(page.Items.Select(i => i.CustomerId).ToList(), ct);
        return page.Map(i => i with { CustomerName = names.GetValueOrDefault(i.CustomerId)?.CompanyName });
    }
}
