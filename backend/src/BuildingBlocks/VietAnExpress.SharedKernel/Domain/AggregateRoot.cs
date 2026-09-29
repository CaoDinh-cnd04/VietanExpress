namespace VietAnExpress.SharedKernel.Domain;

/// <summary>
/// Gốc aggregate (DDD): nơi duy nhất được thay đổi trạng thái của cả cụm entity,
/// và là nơi phát domain event. Event được phát sau khi SaveChanges thành công.
/// </summary>
public abstract class AggregateRoot : BaseEntity
{
    private readonly List<IDomainEvent> _domainEvents = [];

    protected AggregateRoot() { }

    protected AggregateRoot(Guid id) : base(id) { }

    public IReadOnlyCollection<IDomainEvent> DomainEvents => _domainEvents;

    protected void Raise(IDomainEvent domainEvent) => _domainEvents.Add(domainEvent);

    public IReadOnlyList<IDomainEvent> DequeueDomainEvents()
    {
        var events = _domainEvents.ToList();
        _domainEvents.Clear();
        return events;
    }
}
