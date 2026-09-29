using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VietAnExpress.Shipments.Domain;

namespace VietAnExpress.Shipments.Infrastructure.Configurations;

internal sealed class OrderDraftConfiguration : IEntityTypeConfiguration<OrderDraft>
{
    public void Configure(EntityTypeBuilder<OrderDraft> builder)
    {
        builder.ToTable("OrderDrafts");
        builder.HasKey(d => d.Id);
        builder.Property(d => d.Status).HasMaxLength(10).IsRequired();
        builder.Property(d => d.Consignee).HasMaxLength(250).IsRequired();
        builder.Property(d => d.Country).HasMaxLength(100).IsRequired();
        builder.Property(d => d.ServiceName).HasMaxLength(100).IsRequired();
        builder.Property(d => d.Branch).HasMaxLength(50).IsRequired();
        builder.Property(d => d.Reference).HasMaxLength(100).IsRequired();
        builder.Property(d => d.PiecesText).HasMaxLength(100).IsRequired();
        builder.Property(d => d.Content).HasMaxLength(250).IsRequired();
        builder.Property(d => d.PayloadJson).IsRequired(); // nvarchar(max)
        builder.Ignore(d => d.IsReady);

        builder.HasIndex(d => d.CustomerId);
        builder.HasIndex(d => d.PrintedOrderNumber).HasFilter("[PrintedOrderNumber] IS NOT NULL");
    }
}
