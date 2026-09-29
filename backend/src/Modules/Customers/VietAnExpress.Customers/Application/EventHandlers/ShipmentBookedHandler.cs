using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VietAnExpress.Customers.Infrastructure;
using VietAnExpress.Shipments.Contracts;

namespace VietAnExpress.Customers.Application.EventHandlers;

/// <summary>Đơn được cấp bill → tăng số đơn và cập nhật ngày gửi gần nhất của khách.</summary>
internal sealed class ShipmentBookedHandler(CustomersDbContext db, ILogger<ShipmentBookedHandler> logger)
    : INotificationHandler<ShipmentBookedIntegrationEvent>
{
    public async Task Handle(ShipmentBookedIntegrationEvent e, CancellationToken ct)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == e.CustomerId, ct);
        if (customer is null)
        {
            logger.LogWarning("Đơn {ShipmentCode} thuộc khách {CustomerId} không tồn tại", e.ShipmentCode, e.CustomerId);
            return;
        }

        customer.RegisterShipment(e.OccurredAt);
        await db.SaveChangesAsync(ct);
    }
}
