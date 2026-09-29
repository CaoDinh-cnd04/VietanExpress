using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace VietAnExpress.Identity.Infrastructure;

/// <summary>
/// Tài khoản đăng nhập của khách — cột Login_UserName / Login_Password trong <c>dbo.TCustomer</c> (dùng chung với hệ thống cũ).
/// Hệ thống cũ so khớp mật khẩu dạng chữ thường, nên portal cũng lưu y như vậy để 2 bên cùng đăng nhập được.
/// </summary>
internal sealed class CustomerLogin
{
    private CustomerLogin() { } // EF Core

    public CustomerLogin(long customerId, string? userName, string? password)
    {
        CustomerId = customerId;
        UserName = userName;
        Password = password;
    }

    public long CustomerId { get; private set; }
    public string? UserName { get; private set; }
    public string? Password { get; private set; }

    public bool HasPassword => !string.IsNullOrEmpty(Password);

    public void ChangePassword(string newPassword) => Password = newPassword;
}

internal sealed class CustomerLoginConfiguration : IEntityTypeConfiguration<CustomerLogin>
{
    public void Configure(EntityTypeBuilder<CustomerLogin> b)
    {
        b.ToTable("TCustomer", "dbo", t => t.ExcludeFromMigrations());
        b.HasKey(x => x.CustomerId);
        b.Property(x => x.CustomerId).HasColumnName("CustomerID").ValueGeneratedNever();
        b.Property(x => x.UserName).HasColumnName("Login_UserName").HasMaxLength(50);
        b.Property(x => x.Password).HasColumnName("Login_Password").HasMaxLength(150);
    }
}

/// <summary>Chỉ dùng bảng có sẵn dbo.TCustomer — không có migration.</summary>
internal sealed class IdentityDbContext(DbContextOptions<IdentityDbContext> options) : DbContext(options)
{
    public DbSet<CustomerLogin> Logins => Set<CustomerLogin>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(IdentityDbContext).Assembly);
}
