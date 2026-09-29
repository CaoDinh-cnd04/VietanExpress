using MediatR;

namespace VietAnExpress.SharedKernel.Domain;

/// <summary>Sự kiện bên trong 1 module (không vượt ra ngoài module).</summary>
public interface IDomainEvent : INotification
{
    DateTimeOffset OccurredAt { get; }
}

/// <summary>
/// Sự kiện giữa các module — khai báo trong project Contracts của module phát.
/// Hiện chạy in-process qua MediatR; sau này có thể chuyển sang Outbox + message broker mà không đổi handler.
/// </summary>
public interface IIntegrationEvent : INotification
{
    Guid EventId { get; }
    DateTimeOffset OccurredAt { get; }
}

public abstract record IntegrationEvent(DateTimeOffset OccurredAt) : IIntegrationEvent
{
    public Guid EventId { get; init; } = Guid.CreateVersion7();
}
