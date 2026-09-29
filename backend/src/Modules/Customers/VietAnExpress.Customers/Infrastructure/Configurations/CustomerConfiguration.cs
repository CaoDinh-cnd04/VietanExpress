using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VietAnExpress.Customers.Domain;

namespace VietAnExpress.Customers.Infrastructure.Configurations;

internal sealed class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.ToTable("Customers");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Code).HasMaxLength(20).IsRequired();
        // Mã khách duy nhất trên toàn bộ bảng (kể cả bản ghi đã xoá mềm) — không tái sử dụng mã.
        builder.HasIndex(c => c.Code).IsUnique();

        builder.Property(c => c.CompanyName).HasMaxLength(250).IsRequired();
        builder.Property(c => c.TaxCode).HasMaxLength(50);
        builder.Property(c => c.ContactName).HasMaxLength(150);
        builder.Property(c => c.Phone).HasMaxLength(50);
        builder.Property(c => c.Email).HasMaxLength(150);
        builder.Property(c => c.Address).HasMaxLength(500);
        builder.Property(c => c.Note).HasMaxLength(1000);

        builder.HasIndex(c => c.CompanyName);
        builder.HasIndex(c => c.LegacyId).IsUnique().HasFilter("[LegacyId] IS NOT NULL");
    }
}
