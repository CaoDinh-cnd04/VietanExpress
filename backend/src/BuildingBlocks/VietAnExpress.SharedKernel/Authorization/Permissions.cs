namespace VietAnExpress.SharedKernel.Authorization;

/// <summary>Tên claim trong JWT — Identity phát, host và module đọc.</summary>
public static class VaClaimTypes
{
    public const string Subject = "sub";
    public const string Name = "name";
    public const string Role = "role";
    public const string Permission = "permission";
    public const string BranchId = "branch_id";
    public const string CustomerId = "customer_id";
}

/// <summary>
/// Vai trò hệ thống được seed sẵn. Chỉ dùng để gán quyền mặc định khi seed,
/// KHÔNG dùng trong controller — controller luôn kiểm tra theo permission.
/// </summary>
public static class SystemRoles
{
    public const string Admin = "admin";
    public const string Staff = "staff";
    public const string Customer = "customer";
}

/// <summary>1 quyền và các vai trò mặc định được cấp quyền này khi seed. Admin luôn có mọi quyền.</summary>
public sealed record PermissionDefinition(string Code, string Description, params string[] DefaultRoles);

/// <summary>Mỗi module khai báo danh sách quyền của mình; Identity gom lại để seed.</summary>
public interface IPermissionProvider
{
    IEnumerable<PermissionDefinition> GetPermissions();
}
