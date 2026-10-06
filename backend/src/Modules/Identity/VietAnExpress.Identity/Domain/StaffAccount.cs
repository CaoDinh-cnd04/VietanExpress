namespace VietAnExpress.Identity.Domain;

/// <summary>
/// Tài khoản con của khách cho nhân viên (bảng tạm <c>dbo.TaiKhoanNhanVien</c> — người dùng đã đồng ý; sau này ráp vào bảng chính thức).
/// Tài khoản chính ở dbo.TCustomer là admin: tạo / khóa / phân quyền cho tài khoản con. Nhân viên thấy mọi dữ liệu của khách cha
/// (lọc theo <see cref="CustomerId"/>), chỉ dùng được các quyền admin đã chọn.
/// </summary>
internal sealed class StaffAccount
{
    public const int UserNameMinLength = 3;
    public const int UserNameMaxLength = 50;
    public const int PasswordHashMaxLength = 200;
    public const int FullNameMaxLength = 100;
    public const int EmailMaxLength = 150;
    public const int PhoneMaxLength = 30;
    public const int PermissionsMaxLength = 1000;

    /// <summary>Tên đăng nhập: chữ, số, dấu chấm, gạch dưới, gạch ngang, @ — không khoảng trắng.</summary>
    public const string UserNamePattern = @"^[A-Za-z0-9._@-]+$";

    private StaffAccount() { } // EF Core

    public StaffAccount(long customerId, string userName, string passwordHash, string fullName, string? email, string? phone,
        IEnumerable<string> permissions, DateTime now)
    {
        CustomerId = customerId;
        UserName = userName;
        PasswordHash = passwordHash;
        IsActive = true;
        CreateDate = now;
        Update(fullName, email, phone, permissions, isActive: true, now);
        ModifyDate = null;
    }

    public long Id { get; private set; }
    /// <summary>Khách cha — dbo.TCustomer.CustomerID.</summary>
    public long CustomerId { get; private set; }
    public string UserName { get; private set; } = "";
    public string PasswordHash { get; private set; } = "";
    public string FullName { get; private set; } = "";
    public string? Email { get; private set; }
    public string? Phone { get; private set; }
    /// <summary>Mã quyền admin cấp, cách nhau dấu phẩy (vd "shipments.view,shipments.create").</summary>
    public string Permissions { get; private set; } = "";
    public bool IsActive { get; private set; }
    public DateTime? LastLoginAt { get; private set; }
    public DateTime CreateDate { get; private set; }
    public DateTime? ModifyDate { get; private set; }

    public IReadOnlyList<string> PermissionList =>
        Permissions.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public void Update(string fullName, string? email, string? phone, IEnumerable<string> permissions, bool isActive, DateTime now)
    {
        FullName = fullName.Trim();
        Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
        Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();
        Permissions = string.Join(',', permissions.Select(p => p.Trim()).Where(p => p.Length > 0).Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal));
        IsActive = isActive;
        ModifyDate = now;
    }

    public void SetPassword(string passwordHash, DateTime now)
    {
        PasswordHash = passwordHash;
        ModifyDate = now;
    }

    public void RecordLogin(DateTime now) => LastLoginAt = now;
}
