using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VietAnExpress.Shipments.Domain;

namespace VietAnExpress.Shipments.Infrastructure.Configurations;

/// <summary>dbo.VanDonNguoiTao — bảng phụ mới (người dùng đã đồng ý), 1 dòng / vận đơn do tài khoản con tạo.</summary>
internal sealed class OrderCreatorConfiguration : IEntityTypeConfiguration<OrderCreator>
{
    public void Configure(EntityTypeBuilder<OrderCreator> b)
    {
        b.ToTable("VanDonNguoiTao", "dbo");
        b.HasKey(x => x.OrderId);
        b.Property(x => x.OrderId).HasColumnName("MaVanDon_ID").ValueGeneratedNever();
        b.Property(x => x.CustomerId).HasColumnName("CustomerID");
        b.Property(x => x.StaffId).HasColumnName("StaffID");
        b.Property(x => x.CreateDate).HasColumnType("datetime").HasDefaultValueSql("GETDATE()");

        // Lọc "đơn của tôi" của nhân viên: WHERE StaffID = @id.
        b.HasIndex(x => new { x.StaffId, x.OrderId }).HasDatabaseName("IX_VanDonNguoiTao_StaffID");
    }
}
