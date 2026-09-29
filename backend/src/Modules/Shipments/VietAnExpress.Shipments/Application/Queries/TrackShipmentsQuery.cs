using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Domain;
using VietAnExpress.Shipments.Infrastructure;
using VietAnExpress.Shipments.Infrastructure.Legacy;

namespace VietAnExpress.Shipments.Application.Queries;

/// <summary>Tra cứu vận đơn công khai (trang ngoài, không đăng nhập). Tối đa <see cref="MaxBills"/> mã mỗi lần.</summary>
internal sealed record TrackShipmentsQuery(IReadOnlyList<string> Bills) : IRequest<IReadOnlyList<PublicTrackResultDto>>
{
    public const int MaxBills = 10;

    /// <summary>Viết hoa, bỏ khoảng trắng, bỏ trùng, giữ thứ tự nhập.</summary>
    public IReadOnlyList<string> NormalizedBills =>
        Bills.Select(b => (b ?? string.Empty).Trim().ToUpperInvariant())
            .Where(b => b.Length > 0)
            .Distinct()
            .ToList();
}

internal sealed class TrackShipmentsHandler(ShipmentsDbContext db, ILegacyBillReader legacyBills, TimeProvider clock)
    : IRequestHandler<TrackShipmentsQuery, IReadOnlyList<PublicTrackResultDto>>
{
    public async Task<IReadOnlyList<PublicTrackResultDto>> Handle(TrackShipmentsQuery q, CancellationToken ct)
    {
        var bills = q.NormalizedBills;
        var shipments = await db.Shipments.AsNoTracking()
            .Where(s => s.Code != null && bills.Contains(s.Code))
            .Where(s => s.Status != ShipmentStatus.Draft && s.Status != ShipmentStatus.Cancelled)
            .Select(s => new
            {
                Code = s.Code!,
                s.Status,
                s.ServiceCode,
                s.Receiver.City,
                s.Receiver.CountryCode,
                Events = s.TrackingEvents
                    .Where(e => e.IsPublic)
                    .OrderByDescending(e => e.OccurredAt)
                    .Select(e => new { e.OccurredAt, e.Description, e.Location })
                    .ToList()
            })
            .ToDictionaryAsync(s => s.Code, ct);

        // Mã không có trong hệ thống mới → tìm tiếp trong vận đơn cũ (dbo.MaVanDon).
        var missing = bills.Where(b => !shipments.ContainsKey(b)).ToList();
        var legacyRows = await legacyBills.FindAsync(missing, ct);

        return bills.Select(bill => shipments.TryGetValue(bill, out var s)
                ? new PublicTrackResultDto(
                    bill,
                    Found: true,
                    Status: PublicStatus(s.Status),
                    Destination: $"{s.City}, {s.CountryCode}",
                    Service: s.ServiceCode,
                    Events: s.Events.Select(e => new PublicTrackEventDto(VietnamTime.Format(e.OccurredAt), e.Description, e.Location)).ToList())
                : legacyRows.FirstOrDefault(r => LegacyTrackingMapper.Matches(r, bill)) is { } row
                    ? LegacyTrackingMapper.ToResult(bill, row, VietnamTime.ToVietnam(clock.GetUtcNow()).Date)
                    : new PublicTrackResultDto(bill, Found: false))
            .ToList();
    }

    /// <summary>
    /// Mã trạng thái rút gọn mà frontend đang dùng (web/src/features/orders/constants.ts, ORDER_STATUS):
    /// wait = chưa đi, fly = đã đi, nd = chưa phát được, ok = đã phát.
    /// </summary>
    internal static string PublicStatus(ShipmentStatus status) => status switch
    {
        ShipmentStatus.Booked => "wait",
        ShipmentStatus.InTransit => "fly",
        ShipmentStatus.DeliveryFailed => "nd",
        ShipmentStatus.Delivered => "ok",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "Trạng thái không được công khai")
    };
}
