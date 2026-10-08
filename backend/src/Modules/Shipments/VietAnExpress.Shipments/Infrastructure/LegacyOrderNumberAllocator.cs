using Microsoft.EntityFrameworkCore;
using VietAnExpress.SharedKernel.Exceptions;

namespace VietAnExpress.Shipments.Infrastructure;

internal interface ILegacyOrderNumberAllocator
{
    /// <summary>Cấp <paramref name="count"/> số liên tiếp. Phải gọi TRONG transaction ghi đơn (khóa giữ tới khi commit).</summary>
    Task<IReadOnlyList<long>> NextAsync(int count, CancellationToken cancellationToken);
}

/// <summary>
/// Cấp số vận đơn (OrderNumber) cho đơn tạo trên portal, NỐI TIẾP dãy 7 chữ số của hệ thống cũ (cùng bảng dbo.MaVanDon):
/// số lớn nhất dưới <see cref="Limit"/> + 1. Đọc với UPDLOCK + HOLDLOCK trong transaction ghi đơn nên 2 lần cấp cùng lúc trên portal
/// phải chờ nhau, và hệ thống cũ chèn đơn mới vào dãy cũng phải chờ tới khi portal commit — không cấp trùng số.
/// Bỏ qua số 8 chữ số 90.000.001+ (dải riêng portal dùng trước đây).
/// </summary>
internal sealed class LegacyOrderNumberAllocator(ShipmentsDbContext db) : ILegacyOrderNumberAllocator
{
    /// <summary>Dải 8 số portal dùng trước đây — chỉ giữ để không phải xoá sequence đã tạo trong database.</summary>
    public const string SequenceName = "LegacyOrderNumberSequence";
    public const long FirstNumber = 90_000_001;

    /// <summary>Số vận đơn 7 chữ số như hệ thống cũ.</summary>
    public const long Limit = 10_000_000;

    public async Task<IReadOnlyList<long>> NextAsync(int count, CancellationToken cancellationToken)
    {
        if (db.Database.CurrentTransaction is null)
            throw new InvalidOperationException("Cấp số vận đơn phải nằm trong transaction ghi đơn.");

        var max = await db.Database
            .SqlQuery<long?>($"SELECT MAX(OrderNumber) AS [Value] FROM dbo.MaVanDon WITH (UPDLOCK, HOLDLOCK) WHERE OrderNumber < {Limit}")
            .SingleAsync(cancellationToken);
        return Next(max, count);
    }

    /// <summary>Hàm thuần — có test: số kế tiếp sau số lớn nhất hiện có, không vượt quá 7 chữ số.</summary>
    public static IReadOnlyList<long> Next(long? currentMax, int count)
    {
        var first = (currentMax ?? 0) + 1;
        if (count < 1) return [];
        if (first + count - 1 >= Limit)
            throw new ConflictException("ORDER_NUMBER_EXHAUSTED", "Đã hết số vận đơn 7 chữ số, vui lòng liên hệ quản trị hệ thống");
        return [.. Enumerable.Range(0, count).Select(i => first + i)];
    }
}
