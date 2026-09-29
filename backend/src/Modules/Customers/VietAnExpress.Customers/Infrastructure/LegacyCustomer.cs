using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace VietAnExpress.Customers.Infrastructure;

/// <summary>
/// Hồ sơ khách hàng — bảng <c>dbo.TCustomer</c> của hệ thống cũ (chỉ đọc; không migration, không đổi cấu trúc).
/// Chỉ map các cột portal cần.
/// </summary>
internal sealed class LegacyCustomer
{
    public long Id { get; private set; }
    public string? Code { get; private set; }
    public string? CompanyName { get; private set; }
    public string? ContactName { get; private set; }
    public string? ContactEmail { get; private set; }
    public string? Email { get; private set; }
    public string? ContactPhone { get; private set; }
    public string? Phone { get; private set; }
    public string? Address1 { get; private set; }
    public string? TaxCode { get; private set; }
    public int? Status { get; private set; }
}

internal sealed class LegacyCustomerConfiguration : IEntityTypeConfiguration<LegacyCustomer>
{
    public void Configure(EntityTypeBuilder<LegacyCustomer> b)
    {
        b.ToTable("TCustomer", "dbo", t => t.ExcludeFromMigrations());
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("CustomerID");
        b.Property(x => x.Code).HasColumnName("CustomerCode");
        b.Property(x => x.CompanyName).HasColumnName("CustomerName");
    }
}

/// <summary>Chỉ đọc dbo.TCustomer — không có migration.</summary>
internal sealed class CustomersDbContext(DbContextOptions<CustomersDbContext> options) : DbContext(options)
{
    public DbSet<LegacyCustomer> Customers => Set<LegacyCustomer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CustomersDbContext).Assembly);
}
