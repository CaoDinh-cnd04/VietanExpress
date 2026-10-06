using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VietAnExpress.Identity.Domain;

namespace VietAnExpress.Identity.Infrastructure.Configurations;

/// <summary>dbo.MyTrackingCauHinh — bảng mới (người dùng đã đồng ý), 1 dòng / khách.</summary>
internal sealed class MyTrackingPageConfiguration : IEntityTypeConfiguration<MyTrackingPage>
{
    public void Configure(EntityTypeBuilder<MyTrackingPage> b)
    {
        b.ToTable("MyTrackingCauHinh", "dbo");
        b.HasKey(x => x.CustomerId);
        b.Property(x => x.CustomerId).HasColumnName("CustomerID").ValueGeneratedNever();
        b.Property(x => x.Slug).HasColumnName("Duong_Dan").HasMaxLength(MyTrackingPage.SlugMaxLength).IsUnicode(false).IsRequired();
        b.Property(x => x.ConfigJson).HasColumnName("Cau_Hinh").IsRequired();
        b.Property(x => x.IsPublished).HasColumnName("Da_Xuat_Ban");
        b.Property(x => x.CreateDate).HasColumnType("datetime").HasDefaultValueSql("GETDATE()");
        b.Property(x => x.ModifyDate).HasColumnType("datetime");
        b.Ignore(x => x.UpdatedAt);

        b.HasIndex(x => x.Slug).IsUnique().HasDatabaseName("UX_MyTrackingCauHinh_Duong_Dan");
    }
}
