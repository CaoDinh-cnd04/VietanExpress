using Microsoft.EntityFrameworkCore;
using VietAnExpress.SharedKernel.Persistence;
using VietAnExpress.Shipments.Domain;

namespace VietAnExpress.Shipments.Infrastructure;

internal sealed class ShipmentsDbContext(DbContextOptions<ShipmentsDbContext> options) : DbContext(options)
{
    public const string Schema = "shipments";

    public DbSet<OrderDraft> OrderDrafts => Set<OrderDraft>();

    /// <summary>Bảng vận đơn hệ thống cũ dbo.MaVanDon — không thuộc migration của module.</summary>
    public DbSet<Legacy.LegacyOrder> LegacyOrders => Set<Legacy.LegacyOrder>();

    /// <summary>Chi tiết kiện (dbo.MaVanDon_PCS_DIM) và dòng hàng invoice (dbo.MaVanDon_ChiTietHang) của vận đơn — không thuộc migration.</summary>
    public DbSet<Legacy.LegacyPackageLine> LegacyPackageLines => Set<Legacy.LegacyPackageLine>();
    public DbSet<Legacy.LegacyInvoiceLine> LegacyInvoiceLines => Set<Legacy.LegacyInvoiceLine>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(Schema);
        modelBuilder.HasSequence<long>(LegacyOrderNumberAllocator.SequenceName).StartsAt(LegacyOrderNumberAllocator.FirstNumber);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ShipmentsDbContext).Assembly);
        modelBuilder.ApplyBaseEntityConventions();
    }
}
