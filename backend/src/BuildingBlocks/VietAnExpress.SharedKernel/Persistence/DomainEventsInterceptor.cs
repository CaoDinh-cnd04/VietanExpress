using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using VietAnExpress.SharedKernel.Domain;

namespace VietAnExpress.SharedKernel.Persistence;

/// <summary>
/// Phát domain event của các aggregate SAU khi SaveChanges thành công.
/// Lưu ý: event chạy sau khi dữ liệu đã commit — handler lỗi thì dữ liệu chính vẫn đã lưu.
/// Khi cần đảm bảo tuyệt đối (gửi email, đồng bộ hãng), chuyển sang Outbox pattern.
/// </summary>
public sealed class DomainEventsInterceptor(IPublisher publisher) : SaveChangesInterceptor
{
    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        if (eventData.Context is not null)
            await PublishAsync(eventData.Context, cancellationToken);
        return await base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    private async Task PublishAsync(DbContext context, CancellationToken cancellationToken)
    {
        var events = context.ChangeTracker.Entries<AggregateRoot>()
            .SelectMany(e => e.Entity.DequeueDomainEvents())
            .ToList();

        foreach (var domainEvent in events)
            await publisher.Publish(domainEvent, cancellationToken);
    }
}
