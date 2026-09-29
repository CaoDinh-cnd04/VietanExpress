using System.Globalization;
using Microsoft.Extensions.Configuration;
using VietAnExpress.SharedKernel.Persistence;

namespace VietAnExpress.Shipments.Infrastructure;

internal interface IShipmentCodeGenerator
{
    Task<string> NextAsync(CancellationToken cancellationToken);
}

/// <summary>
/// Cấp mã vận đơn = tiền tố + số từ SQL Sequence (an toàn khi nhiều người cấp bill cùng lúc).
/// Bắt đầu từ 10.000.001 để không trùng dải số OrderNumber của hệ thống cũ (dbo.MaVanDon, hiện ~6 triệu).
/// </summary>
internal sealed class ShipmentCodeGenerator(ShipmentsDbContext db, IConfiguration configuration) : IShipmentCodeGenerator
{
    public const string SequenceName = "ShipmentCodeSequence";
    public const long FirstNumber = 10_000_001;

    public async Task<string> NextAsync(CancellationToken cancellationToken)
    {
        var prefix = configuration["Shipments:CodePrefix"] ?? "VA";
        var next = await db.Database.NextSequenceValueAsync(ShipmentsDbContext.Schema, SequenceName, cancellationToken);
        return prefix + next.ToString(CultureInfo.InvariantCulture);
    }
}
