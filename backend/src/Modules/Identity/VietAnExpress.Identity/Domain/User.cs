using VietAnExpress.SharedKernel.Domain;

namespace VietAnExpress.Identity.Domain;

/// <summary>Tài khoản đăng nhập — nhân viên (CustomerId = null) hoặc khách hàng portal (có CustomerId).</summary>
internal sealed class User : BaseEntity
{
    private readonly List<UserRole> _roles = [];

    private User() { } // EF Core

    public User(string userName, string fullName, string? email, Guid? customerId, Guid? branchId)
    {
        UserName = userName.Trim();
        NormalizedUserName = Normalize(UserName)!;
        FullName = fullName.Trim();
        SetEmail(email);
        CustomerId = customerId;
        BranchId = branchId;
        IsActive = true;
    }

    public string UserName { get; private set; } = null!;
    /// <summary>Dạng chuẩn hoá (viết hoa) để so khớp không phân biệt hoa thường; có unique index.</summary>
    public string NormalizedUserName { get; private set; } = null!;
    public string? Email { get; private set; }
    public string? NormalizedEmail { get; private set; }
    public string FullName { get; private set; } = null!;
    public string PasswordHash { get; private set; } = string.Empty;
    public bool IsActive { get; private set; }

    /// <summary>Khách hàng mà tài khoản đại diện (Id bên module Customers). Null = nhân viên Việt An.</summary>
    public Guid? CustomerId { get; private set; }

    public int AccessFailedCount { get; private set; }
    public DateTimeOffset? LockoutEnd { get; private set; }
    public DateTimeOffset? LastLoginAt { get; private set; }
    public DateTimeOffset? PasswordChangedAt { get; private set; }

    public IReadOnlyCollection<UserRole> Roles => _roles.AsReadOnly();

    public static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToUpperInvariant();

    public void SetEmail(string? email)
    {
        Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
        NormalizedEmail = Normalize(Email);
    }

    public void SetPassword(string passwordHash, DateTimeOffset now)
    {
        PasswordHash = passwordHash;
        PasswordChangedAt = now;
    }

    /// <summary>Băm lại mật khẩu khi thuật toán băm được nâng cấp — không tính là đổi mật khẩu.</summary>
    public void RehashPassword(string passwordHash) => PasswordHash = passwordHash;

    public void SetActive(bool isActive) => IsActive = isActive;

    public void AssignRole(Guid roleId)
    {
        if (_roles.All(r => r.RoleId != roleId)) _roles.Add(new UserRole(Id, roleId));
    }

    public bool IsLockedOut(DateTimeOffset now) => LockoutEnd is { } end && end > now;

    /// <summary>Sai mật khẩu: đếm số lần; quá ngưỡng thì khoá tạm thời (chống dò mật khẩu).</summary>
    public void RecordFailedLogin(DateTimeOffset now, int maxAttempts, TimeSpan lockoutDuration)
    {
        AccessFailedCount++;
        if (AccessFailedCount < maxAttempts) return;

        LockoutEnd = now.Add(lockoutDuration);
        AccessFailedCount = 0;
    }

    public void RecordSuccessfulLogin(DateTimeOffset now)
    {
        AccessFailedCount = 0;
        LockoutEnd = null;
        LastLoginAt = now;
    }
}

internal sealed class UserRole
{
    private UserRole() { } // EF Core

    public UserRole(Guid userId, Guid roleId)
    {
        UserId = userId;
        RoleId = roleId;
    }

    public Guid UserId { get; private set; }
    public Guid RoleId { get; private set; }
}
