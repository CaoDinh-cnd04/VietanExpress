using System.Globalization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Persistence;
using VietAnExpress.SharedKernel.Results;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Infrastructure;
using VietAnExpress.Shipments.Infrastructure.Legacy;

namespace VietAnExpress.Shipments.Application.Orders;

// ---------- Danh sách đơn (GET /orders) ----------

/// <summary>
/// Tham số lọc giống hợp đồng frontend (OrderFilters). Type: DOC | PACK — nhận diện theo tên hàng (<see cref="LegacyDocumentRule"/>).
/// Không lọc chi nhánh: dbo.MaVanDon không có cột chi nhánh.
/// </summary>
internal sealed record GetOrdersQuery(
    string? Q,
    string? SearchField,
    string? Status,
    string? Type,
    DateOnly? FromDate,
    DateOnly? ToDate,
    decimal? WeightFrom,
    decimal? WeightTo,
    int? Page,
    int? PageSize,
    string? SortBy,
    string? SortDir) : IRequest<OrderListResponse>;

internal sealed class GetOrdersHandler(ShipmentsDbContext db, OrderAccess access, TimeProvider clock)
    : IRequestHandler<GetOrdersQuery, OrderListResponse>
{
    public async Task<OrderListResponse> Handle(GetOrdersQuery q, CancellationToken ct)
    {
        var today = VietnamTime.ToVietnam(clock.GetUtcNow()).Date;
        var query = access.Apply(db.LegacyOrders.AsNoTracking(), await access.ScopeAsync(ct));
        query = OrderListFilter.Apply(query, q);

        // Số đếm theo trạng thái tính trên kết quả lọc TRỪ lọc trạng thái — để số trên các tab luôn đúng.
        var counts = new Dictionary<string, int> { ["all"] = await query.CountAsync(ct) };
        foreach (var status in LegacyOrderStatus.All)
            counts[status] = await query.CountAsync(LegacyOrderStatus.Is(status, today), ct);
        var totals = await query
            .GroupBy(_ => 1)
            .Select(g => new { Pieces = g.Sum(o => o.Pieces ?? 0), Weight = g.Sum(o => o.WeightKg ?? 0) })
            .FirstOrDefaultAsync(ct);

        if (q.Status is { } st && LegacyOrderStatus.All.Contains(st))
            query = query.Where(LegacyOrderStatus.Is(st, today));

        var page = await OrderListFilter.Sort(query, q.SortBy, q.SortDir).ToPagedResultAsync(q.Page, q.PageSize, ct);
        return new OrderListResponse(
            page.Items.Select(o => LegacyOrderView.ToDto(o, today)).ToList(),
            page.TotalCount, page.Page, page.PageSize, page.TotalPages,
            new OrderSummaryDto(counts, totals?.Pieces ?? 0, totals?.Weight ?? 0));
    }
}

/// <summary>Bộ lọc + sắp xếp dùng chung cho danh sách đơn và xuất bảng kê — 2 nơi luôn ra cùng tập đơn.</summary>
internal static class OrderListFilter
{
    public static IQueryable<LegacyOrder> Apply(IQueryable<LegacyOrder> query, GetOrdersQuery q)
    {
        if (q.Q.ToLikePattern() is { } like)
        {
            // Gõ 1 phần số VA (vd "6010") cũng tìm ra — so khớp chuỗi số, không cần gõ đủ.
            var digits = q.Q!.Trim().All(char.IsAsciiDigit);
            query = (q.SearchField ?? "all") switch
            {
                "cnee" => query.Where(o => EF.Functions.Like(o.ConsigneeName!, like) || EF.Functions.Like(o.ConsigneeContactName!, like)),
                "bill" => query.Where(o => (digits && o.OrderNumber != null && EF.Functions.Like(o.OrderNumber.Value.ToString(), like))
                    || EF.Functions.Like(o.BillConnect!, like)),
                "ref" => query.Where(o => EF.Functions.Like(o.CustomerBill!, like)),
                "ct" => query.Where(o => EF.Functions.Like(o.ConsigneeCountry!, like)),
                _ => query.Where(o => (digits && o.OrderNumber != null && EF.Functions.Like(o.OrderNumber.Value.ToString(), like))
                    || EF.Functions.Like(o.BillConnect!, like)
                    || EF.Functions.Like(o.CustomerBill!, like)
                    || EF.Functions.Like(o.ConsigneeName!, like)
                    || EF.Functions.Like(o.ConsigneeCountry!, like))
            };
        }

        if (q.FromDate is { } from)
        {
            var fromDate = from.ToDateTime(TimeOnly.MinValue);
            query = query.Where(o => o.CreateDate >= fromDate);
        }
        if (q.ToDate is { } to)
        {
            var toDate = to.ToDateTime(TimeOnly.MinValue);
            query = query.Where(o => o.CreateDate <= toDate);
        }
        query = q.Type?.Trim().ToUpperInvariant() switch
        {
            "DOC" => query.Where(LegacyDocumentRule.IsDocument),
            "PACK" => query.Where(LegacyDocumentRule.IsNotDocument),
            _ => query
        };
        if (q.WeightFrom is { } wFrom) query = query.Where(o => o.WeightKg >= wFrom);
        if (q.WeightTo is { } wTo) query = query.Where(o => o.WeightKg <= wTo);
        return query;
    }

    public static IOrderedQueryable<LegacyOrder> Sort(IQueryable<LegacyOrder> query, string? sortBy, string? sortDir)
    {
        var asc = string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
        IOrderedQueryable<LegacyOrder> By<TKey>(System.Linq.Expressions.Expression<Func<LegacyOrder, TKey>> key) =>
            asc ? query.OrderBy(key) : query.OrderByDescending(key);

        var ordered = sortBy switch
        {
            "ref" => By(o => o.CustomerBill),
            "bill" => By(o => o.OrderNumber),
            "cnee" => By(o => o.ConsigneeName),
            "ct" => By(o => o.ConsigneeCountry),
            "sent" => By(o => o.SentDate),
            "pod" => By(o => o.PodEstimate),
            "created" => By(o => o.CreateDate),
            _ => By(o => o.Id)
        };
        // Khoá phụ để phân trang ổn định.
        return asc ? ordered.ThenBy(o => o.Id) : ordered.ThenByDescending(o => o.Id);
    }
}

// ---------- Chi tiết 1 đơn + hành trình ----------

internal sealed record GetOrderQuery(string Bill) : IRequest<Result<OrderDto>>;

internal sealed record GetOrderEventsQuery(string Bill) : IRequest<Result<IReadOnlyList<OrderEventDto>>>;

internal sealed class GetOrderHandlers(ShipmentsDbContext db, OrderAccess access, TimeProvider clock) :
    IRequestHandler<GetOrderQuery, Result<OrderDto>>,
    IRequestHandler<GetOrderEventsQuery, Result<IReadOnlyList<OrderEventDto>>>
{
    public async Task<Result<OrderDto>> Handle(GetOrderQuery q, CancellationToken ct)
    {
        var order = await FindAsync(q.Bill, ct);
        return order is null
            ? OrderErrors.NotFound(q.Bill)
            : LegacyOrderView.ToDetailDto(order, VietnamTime.ToVietnam(clock.GetUtcNow()).Date);
    }

    public async Task<Result<IReadOnlyList<OrderEventDto>>> Handle(GetOrderEventsQuery q, CancellationToken ct)
    {
        var order = await FindAsync(q.Bill, ct);
        return order is null
            ? Result.Failure<IReadOnlyList<OrderEventDto>>(OrderErrors.NotFound(q.Bill))
            : Result.Success(LegacyOrderView.Events(order, hideSigner: false));
    }

    /// <summary>Tìm theo số VA hoặc mã hãng, trong phạm vi khách của người dùng.</summary>
    private async Task<LegacyOrder?> FindAsync(string bill, CancellationToken ct)
    {
        var code = bill.Trim();
        long? number = long.TryParse(code, NumberStyles.None, CultureInfo.InvariantCulture, out var n) ? n : null;
        var query = access.Apply(db.LegacyOrders.AsNoTracking(), await access.ScopeAsync(ct));
        return await query
            .Where(o => o.OrderNumber == number || o.BillConnect == code)
            .OrderByDescending(o => o.Id)
            .FirstOrDefaultAsync(ct);
    }
}
