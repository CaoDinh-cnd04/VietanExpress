using System.Globalization;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace VietAnExpress.Shipments.Infrastructure.Legacy;

/// <summary>
/// Tìm vận đơn (chỉ đọc) trong dbo.MaVanDon cho tra cứu công khai.
/// Khớp theo số VA (OrderNumber), mã hãng (Bill_Connect), AWB hoặc mã bill của khách.
/// </summary>
internal interface ILegacyBillReader
{
    Task<IReadOnlyList<LegacyOrder>> FindAsync(IReadOnlyList<string> bills, CancellationToken cancellationToken);
}

internal sealed class LegacyBillReader(ShipmentsDbContext db, ILogger<LegacyBillReader> logger) : ILegacyBillReader
{
    public async Task<IReadOnlyList<LegacyOrder>> FindAsync(IReadOnlyList<string> bills, CancellationToken cancellationToken)
    {
        if (bills.Count == 0) return [];

        var numbers = bills
            .Select(b => long.TryParse(b, NumberStyles.None, CultureInfo.InvariantCulture, out var n) ? n : (long?)null)
            .OfType<long>()
            .ToList();
        try
        {
            return await db.LegacyOrders.AsNoTracking()
                .Where(o => (o.OrderNumber != null && numbers.Contains(o.OrderNumber.Value))
                    || (o.BillConnect != null && bills.Contains(o.BillConnect))
                    || (o.Awb != null && bills.Contains(o.Awb))
                    || (o.CustomerBill != null && bills.Contains(o.CustomerBill)))
                .ToListAsync(cancellationToken);
        }
        catch (SqlException ex) when (ex.Number == 208)
        {
            // 208 = không có bảng (database mới / môi trường test) → coi như không có vận đơn cũ.
            logger.LogWarning("Không có bảng dbo.MaVanDon — bỏ qua tra cứu vận đơn cũ");
            return [];
        }
    }
}
