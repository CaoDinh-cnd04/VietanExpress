using MediatR;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Infrastructure.Legacy;

namespace VietAnExpress.Shipments.Application.Queries;

/// <summary>Tra cứu vận đơn công khai (trang ngoài, không đăng nhập) trong dbo.MaVanDon. Tối đa <see cref="MaxBills"/> mã mỗi lần.</summary>
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

internal sealed class TrackShipmentsHandler(ILegacyBillReader legacyBills, TimeProvider clock)
    : IRequestHandler<TrackShipmentsQuery, IReadOnlyList<PublicTrackResultDto>>
{
    public async Task<IReadOnlyList<PublicTrackResultDto>> Handle(TrackShipmentsQuery q, CancellationToken ct)
    {
        var bills = q.NormalizedBills;
        var rows = await legacyBills.FindAsync(bills, ct);
        var today = VietnamTime.ToVietnam(clock.GetUtcNow()).Date;

        return bills.Select(bill => rows.FirstOrDefault(r => LegacyTrackingMapper.Matches(r, bill)) is { } row
                ? LegacyTrackingMapper.ToResult(bill, row, today)
                : new PublicTrackResultDto(bill, Found: false))
            .ToList();
    }
}
