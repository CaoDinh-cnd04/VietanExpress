namespace VietAnExpress.Identity.Contracts;

/// <summary>Quyền chỉ tài khoản chính (admin) của khách có — không cấp được cho tài khoản con.</summary>
public static class IdentityPermissions
{
    public const string ManageStaff = "account.staff";
    public const string MyTracking = "account.mytracking";

    public static readonly IReadOnlySet<string> AdminOnly = new HashSet<string>(StringComparer.Ordinal) { ManageStaff, MyTracking };
}
