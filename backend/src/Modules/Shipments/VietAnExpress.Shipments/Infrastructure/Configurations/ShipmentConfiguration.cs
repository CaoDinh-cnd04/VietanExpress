using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VietAnExpress.Shipments.Domain;

namespace VietAnExpress.Shipments.Infrastructure.Configurations;

internal sealed class ShipmentConfiguration : IEntityTypeConfiguration<Shipment>
{
    public void Configure(EntityTypeBuilder<Shipment> builder)
    {
        builder.ToTable("Shipments");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Code).HasMaxLength(30);
        // Mã vận đơn duy nhất; đơn nháp chưa có mã (NULL) nên dùng filtered index.
        builder.HasIndex(s => s.Code).IsUnique().HasFilter("[Code] IS NOT NULL");

        builder.Property(s => s.CustomerReference).HasMaxLength(100);
        // Lưu enum dạng chữ để đọc DB trực tiếp vẫn hiểu (Booked, InTransit…).
        builder.Property(s => s.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.ContentType).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.ServiceCode).HasMaxLength(30).IsRequired();
        builder.Property(s => s.GoodsDescription).HasMaxLength(500).IsRequired();

        builder.Property(s => s.ActualWeightKg).HasPrecision(10, 2);
        builder.Property(s => s.VolumetricWeightKg).HasPrecision(10, 2);
        builder.Property(s => s.ChargeableWeightKg).HasPrecision(10, 2);

        builder.Property(s => s.ReceivedBy).HasMaxLength(150);
        builder.Property(s => s.LastFailureReason).HasMaxLength(500);
        builder.Property(s => s.CancelReason).HasMaxLength(500);
        builder.Property(s => s.RowVersion).IsRowVersion();

        builder.ComplexProperty(s => s.Sender, a => ConfigureAddress(a));
        builder.ComplexProperty(s => s.Receiver, a => ConfigureAddress(a));
        builder.ComplexProperty(s => s.DeclaredValue, m =>
        {
            m.Property(x => x.Amount).HasPrecision(18, 2);
            m.Property(x => x.Currency).HasMaxLength(3).IsFixedLength();
        });

        builder.HasMany(s => s.Packages).WithOne().HasForeignKey("ShipmentId").OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(s => s.Packages).HasField("_packages").UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasMany(s => s.TrackingEvents).WithOne().HasForeignKey("ShipmentId").OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(s => s.TrackingEvents).HasField("_trackingEvents").UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.Ignore(s => s.IsEditable);

        builder.HasIndex(s => s.CustomerId);
        builder.HasIndex(s => s.Status);
        builder.HasIndex(s => s.CreatedAt);
    }

    private static void ConfigureAddress(ComplexPropertyBuilder<Address> a)
    {
        a.Property(x => x.ContactName).HasMaxLength(150).IsRequired();
        a.Property(x => x.CompanyName).HasMaxLength(250);
        a.Property(x => x.Phone).HasMaxLength(50).IsRequired();
        a.Property(x => x.Email).HasMaxLength(150);
        a.Property(x => x.Line1).HasMaxLength(250).IsRequired();
        a.Property(x => x.Line2).HasMaxLength(250);
        a.Property(x => x.City).HasMaxLength(100).IsRequired();
        a.Property(x => x.State).HasMaxLength(100);
        a.Property(x => x.PostalCode).HasMaxLength(20);
        a.Property(x => x.CountryCode).HasMaxLength(2).IsFixedLength().IsRequired();
    }
}
