using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VietAnExpress.Shipments.Domain;

namespace VietAnExpress.Shipments.Infrastructure.Configurations;

internal sealed class ShipmentPackageConfiguration : IEntityTypeConfiguration<ShipmentPackage>
{
    public void Configure(EntityTypeBuilder<ShipmentPackage> builder)
    {
        builder.ToTable("ShipmentPackages");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).ValueGeneratedNever();

        builder.Property(p => p.WeightKg).HasPrecision(10, 2);
        builder.Property(p => p.LengthCm).HasPrecision(10, 2);
        builder.Property(p => p.WidthCm).HasPrecision(10, 2);
        builder.Property(p => p.HeightCm).HasPrecision(10, 2);

        builder.Ignore(p => p.ActualWeightKg);
        builder.Ignore(p => p.VolumetricWeightKg);
    }
}

internal sealed class ShipmentTrackingEventConfiguration : IEntityTypeConfiguration<ShipmentTrackingEvent>
{
    public void Configure(EntityTypeBuilder<ShipmentTrackingEvent> builder)
    {
        builder.ToTable("ShipmentTrackingEvents");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).ValueGeneratedNever();

        builder.Property(e => e.Description).HasMaxLength(500).IsRequired();
        builder.Property(e => e.Location).HasMaxLength(200);

        builder.HasIndex("ShipmentId", nameof(ShipmentTrackingEvent.OccurredAt));
    }
}
