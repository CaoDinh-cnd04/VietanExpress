using VietAnExpress.SharedKernel.Domain;

namespace VietAnExpress.Shipments.Domain.Events;

internal sealed record ShipmentBillIssuedDomainEvent(Guid ShipmentId, string Code, Guid CustomerId, DateTimeOffset OccurredAt) : IDomainEvent;

internal sealed record ShipmentDeliveredDomainEvent(Guid ShipmentId, string Code, Guid CustomerId, string ReceivedBy, DateTimeOffset OccurredAt) : IDomainEvent;

internal sealed record ShipmentCancelledDomainEvent(Guid ShipmentId, string? Code, Guid CustomerId, string Reason, DateTimeOffset OccurredAt) : IDomainEvent;
