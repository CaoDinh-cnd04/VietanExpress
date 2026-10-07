namespace VietAnExpress.Identity.Contracts;

/// <summary>Quyền chỉ tài khoản chính (admin) của khách có — không cấp được cho tài khoản con.</summary>
public static class IdentityPermissions
{
    public const string ManageStaff = "account.staff";
    public const string MyTracking = "account.mytracking";
    /// <summary>Tự đổi mật khẩu — tài khoản con không có (admin đặt lại ở trang Tài khoản nhân viên).</summary>
    public const string ChangePassword = "account.password";

    public static readonly IReadOnlySet<string> AdminOnly = new HashSet<string>(StringComparer.Ordinal) { ManageStaff, MyTracking, ChangePassword };
}
