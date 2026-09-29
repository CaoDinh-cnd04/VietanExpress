using MediatR;
using VietAnExpress.Shipments.Contracts;
using VietAnExpress.Shipments.Domain.Events;

namespace VietAnExpress.Shipments.Application.EventHandlers;

/// <summary>
/// Chuyển domain event (nội bộ module) thành integration event (công khai trong Contracts)
/// để module khác phản ứng mà không phụ thuộc vào domain của Shipments.
/// </summary>
internal sealed class ShipmentIntegrationEventPublisher(IPublisher publisher) :
    INotificationHandler<ShipmentBillIssuedDomainEvent>,
    INotificationHandler<ShipmentDeliveredDomainEvent>
{
    public Task Handle(ShipmentBillIssuedDomainEvent e, CancellationToken ct) =>
        publisher.Publish(new ShipmentBookedIntegrationEvent(e.ShipmentId, e.Code, e.CustomerId, e.OccurredAt), ct);

    public Task Handle(ShipmentDeliveredDomainEvent e, CancellationToken ct) =>
        publisher.Publish(new ShipmentDeliveredIntegrationEvent(e.ShipmentId, e.Code, e.CustomerId, e.ReceivedBy, e.OccurredAt), ct);
}
