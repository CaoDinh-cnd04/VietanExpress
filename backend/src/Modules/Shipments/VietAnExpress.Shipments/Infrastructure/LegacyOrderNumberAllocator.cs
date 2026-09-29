using Microsoft.EntityFrameworkCore;
using VietAnExpress.SharedKernel.Exceptions;
using VietAnExpress.SharedKernel.Persistence;

namespace VietAnExpress.Shipments.Infrastructure;

internal interface ILegacyOrderNumberAllocator
{
    Task<long> NextAsync(CancellationToken cancellationToken);
}

/// <summary>
/// Cấp số vận đơn (OrderNumber) cho đơn tạo trên portal.
/// Hệ thống cũ vẫn cấp số song song trên cùng bảng dbo.MaVanDon (hiện khoảng 6 triệu),
/// nên portal dùng DẢI RIÊNG bắt đầu từ <see cref="FirstNumber"/> qua SQL Sequence,
/// và bỏ qua số đã có (phòng khi hệ thống cũ từng cấp trùng dải).
/// </summary>
internal sealed class LegacyOrderNumberAllocator(ShipmentsDbContext db) : ILegacyOrderNumberAllocator
{
    public const string SequenceName = "LegacyOrderNumberSequence";
    public const long FirstNumber = 90_000_001;
    private const int MaxAttempts = 20;

    public async Task<long> NextAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < MaxAttempts; attempt++)
        {
            var number = await db.Database.NextSequenceValueAsync(ShipmentsDbContext.Schema, SequenceName, cancellationToken);
            if (!await db.LegacyOrders.AnyAsync(o => o.OrderNumber == number, cancellationToken))
                return number;
        }
        throw new ConflictException("ORDER_NUMBER_EXHAUSTED", "Không cấp được số vận đơn mới, vui lòng liên hệ quản trị hệ thống");
    }
}
