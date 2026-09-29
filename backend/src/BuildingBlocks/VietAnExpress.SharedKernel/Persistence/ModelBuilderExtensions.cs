using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.SharedKernel.Domain;

namespace VietAnExpress.SharedKernel.Persistence;

public static class ModelBuilderExtensions
{
    /// <summary>
    /// Áp quy ước chung cho mọi <see cref="BaseEntity"/> trong model:
    /// Id không tự sinh ở DB, global query filter xoá mềm, index BranchId.
    /// Gọi ở cuối OnModelCreating của mỗi module DbContext.
    /// </summary>
    public static ModelBuilder ApplyBaseEntityConventions(this ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;
            if (!typeof(BaseEntity).IsAssignableFrom(clrType) || entityType.BaseType is not null) continue;

            var builder = modelBuilder.Entity(clrType);
            builder.Property(nameof(BaseEntity.Id)).ValueGeneratedNever();
            builder.HasIndex(nameof(BaseEntity.BranchId));
            if (typeof(AggregateRoot).IsAssignableFrom(clrType))
                builder.Ignore(nameof(AggregateRoot.DomainEvents));

            // e => !e.IsDeleted
            var parameter = Expression.Parameter(clrType, "e");
            var filter = Expression.Lambda(
                Expression.Not(Expression.Property(parameter, nameof(BaseEntity.IsDeleted))),
                parameter);
            builder.HasQueryFilter(filter);
        }

        return modelBuilder;
    }
}
