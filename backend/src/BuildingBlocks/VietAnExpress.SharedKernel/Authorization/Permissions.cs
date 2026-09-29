namespace VietAnExpress.SharedKernel.Authorization;

/// <summary>Tên claim trong JWT — Identity phát, host và module đọc.</summary>
public static class VaClaimTypes
{
    public const string Subject = "sub";
    public const string Name = "name";
    public const string Role = "role";
    public const string Permission = "permission";
    public const string CustomerId = "customer_id";
}

/// <summary>Vai trò. Portal chỉ có khách hàng; controller luôn kiểm tra theo permission, không theo vai trò.</summary>
public static class SystemRoles
{
    public const string Customer = "customer";
}

/// <summary>1 quyền và các vai trò được cấp quyền này (khai báo trong code, không lưu DB).</summary>
public sealed record PermissionDefinition(string Code, string Description, params string[] DefaultRoles);

/// <summary>Mỗi module khai báo danh sách quyền của mình; Identity gom lại để cấp vào token.</summary>
public interface IPermissionProvider
{
    IEnumerable<PermissionDefinition> GetPermissions();
}
