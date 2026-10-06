using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VietAnExpress.Identity.Domain;

namespace VietAnExpress.Identity.Infrastructure.Configurations;

/// <summary>dbo.TaiKhoanNhanVien — bảng tạm (người dùng đã đồng ý), tên cột theo kiểu bảng cũ.</summary>
internal sealed class StaffAccountConfiguration : IEntityTypeConfiguration<StaffAccount>
{
    public void Configure(EntityTypeBuilder<StaffAccount> b)
    {
        b.ToTable("TaiKhoanNhanVien", "dbo");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("ID").UseIdentityColumn();
        b.Property(x => x.CustomerId).HasColumnName("CustomerID");
        b.Property(x => x.UserName).HasColumnName("Ten_Dang_Nhap").HasMaxLength(StaffAccount.UserNameMaxLength).IsUnicode(false).IsRequired();
        b.Property(x => x.PasswordHash).HasColumnName("Mat_Khau_Bam").HasMaxLength(StaffAccount.PasswordHashMaxLength).IsUnicode(false).IsRequired();
        b.Property(x => x.FullName).HasColumnName("Ho_Ten").HasMaxLength(StaffAccount.FullNameMaxLength).IsRequired();
        b.Property(x => x.Email).HasColumnName("Email").HasMaxLength(StaffAccount.EmailMaxLength).IsUnicode(false);
        b.Property(x => x.Phone).HasColumnName("Dien_Thoai").HasMaxLength(StaffAccount.PhoneMaxLength).IsUnicode(false);
        b.Property(x => x.Permissions).HasColumnName("Quyen").HasMaxLength(StaffAccount.PermissionsMaxLength).IsUnicode(false).IsRequired();
        b.Property(x => x.IsActive).HasColumnName("Dang_Hoat_Dong");
        b.Property(x => x.LastLoginAt).HasColumnName("Dang_Nhap_Lan_Cuoi").HasColumnType("datetime");
        b.Property(x => x.CreateDate).HasColumnType("datetime").HasDefaultValueSql("GETDATE()");
        b.Property(x => x.ModifyDate).HasColumnType("datetime");
        b.Ignore(x => x.PermissionList);

        // Tên đăng nhập duy nhất toàn hệ thống (đăng nhập chỉ nhập tên + mật khẩu, không nhập mã khách).
        b.HasIndex(x => x.UserName).IsUnique().HasDatabaseName("UX_TaiKhoanNhanVien_Ten_Dang_Nhap");
        b.HasIndex(x => x.CustomerId).HasDatabaseName("IX_TaiKhoanNhanVien_CustomerID");
    }
}
