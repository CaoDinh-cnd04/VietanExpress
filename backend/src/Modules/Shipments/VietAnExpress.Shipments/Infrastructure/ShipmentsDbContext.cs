using Microsoft.EntityFrameworkCore;
using VietAnExpress.SharedKernel.Persistence;
using VietAnExpress.Shipments.Domain;

namespace VietAnExpress.Shipments.Infrastructure;

internal sealed class ShipmentsDbContext(DbContextOptions<ShipmentsDbContext> options) : DbContext(options)
{
    public const string Schema = "shipments";

    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<OrderDraft> OrderDrafts => Set<OrderDraft>();

    /// <summary>Bảng vận đơn hệ thống cũ dbo.MaVanDon — không thuộc migration của module.</summary>
    public DbSet<Legacy.LegacyOrder> LegacyOrders => Set<Legacy.LegacyOrder>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(Schema);
        modelBuilder.HasSequence<long>(ShipmentCodeGenerator.SequenceName).StartsAt(ShipmentCodeGenerator.FirstNumber);
        modelBuilder.HasSequence<long>(LegacyOrderNumberAllocator.SequenceName).StartsAt(LegacyOrderNumberAllocator.FirstNumber);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ShipmentsDbContext).Assembly);
        modelBuilder.ApplyBaseEntityConventions();
    }
}
