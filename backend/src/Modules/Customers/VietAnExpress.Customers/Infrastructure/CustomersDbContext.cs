using Microsoft.EntityFrameworkCore;
using VietAnExpress.Customers.Domain;
using VietAnExpress.SharedKernel.Persistence;

namespace VietAnExpress.Customers.Infrastructure;

internal sealed class CustomersDbContext(DbContextOptions<CustomersDbContext> options) : DbContext(options)
{
    public const string Schema = "customers";

    public DbSet<Customer> Customers => Set<Customer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(Schema);
        modelBuilder.HasSequence<long>(CustomerCodeGenerator.SequenceName).StartsAt(1);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CustomersDbContext).Assembly);
        modelBuilder.ApplyBaseEntityConventions();
    }
}
