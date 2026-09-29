using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Domain;

namespace VietAnExpress.SharedKernel.Persistence;

/// <summary>
/// Tự điền CreatedAt/By, UpdatedAt/By, BranchId và đổi lệnh xoá thành xoá mềm
/// cho mọi <see cref="BaseEntity"/> trước khi lưu.
/// </summary>
public sealed class AuditableEntityInterceptor(ICurrentUser currentUser, TimeProvider clock) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        ApplyAudit(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        ApplyAudit(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void ApplyAudit(DbContext? context)
    {
        if (context is null) return;

        var now = clock.GetUtcNow();
        var userId = currentUser.UserId;

        foreach (var entry in context.ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.MarkCreated(now, userId, currentUser.BranchId);
                    break;
                case EntityState.Modified:
                    entry.Entity.MarkUpdated(now, userId);
                    break;
                case EntityState.Deleted:
                    // Không xoá thật: chuyển sang cập nhật cờ IsDeleted.
                    entry.State = EntityState.Modified;
                    entry.Entity.MarkDeleted(now, userId);
                    break;
            }
        }
    }
}
