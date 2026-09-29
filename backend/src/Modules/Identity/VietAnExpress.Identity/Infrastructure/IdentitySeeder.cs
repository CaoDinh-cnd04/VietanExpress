using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VietAnExpress.Identity.Domain;
using VietAnExpress.SharedKernel.Authorization;
using VietAnExpress.SharedKernel.Persistence;

namespace VietAnExpress.Identity.Infrastructure;

/// <summary>
/// Chạy mỗi lần khởi động (sau migrate), idempotent:
/// 1. Đồng bộ danh mục quyền từ khai báo của mọi module.
/// 2. Tạo 3 vai trò hệ thống và cấp quyền mặc định (chỉ THÊM, không gỡ quyền admin đã chỉnh tay).
/// 3. Tạo tài khoản admin đầu tiên nếu chưa có ai giữ vai trò admin và đã cấu hình mật khẩu.
/// </summary>
internal sealed class IdentitySeeder(
    IdentityDbContext db,
    IEnumerable<IPermissionProvider> providers,
    IPasswordService passwords,
    IOptions<IdentityModuleOptions> options,
    TimeProvider clock,
    ILogger<IdentitySeeder> logger) : IModuleStartupTask
{
    private static readonly (string Name, string Description)[] SystemRoleDefinitions =
    [
        (SystemRoles.Admin, "Quản trị hệ thống — toàn quyền"),
        (SystemRoles.Staff, "Nhân viên Việt An"),
        (SystemRoles.Customer, "Khách hàng dùng portal")
    ];

    public int Order => 100;

    public async Task RunAsync(CancellationToken ct)
    {
        var definitions = providers.SelectMany(p => p.GetPermissions()).ToList();
        var permissions = await SyncPermissionsAsync(definitions, ct);
        var roles = await EnsureRolesAsync(ct);
        GrantDefaults(roles, permissions, definitions);
        await db.SaveChangesAsync(ct);

        await EnsureAdminAsync(roles[SystemRoles.Admin], ct);
    }

    private async Task<Dictionary<string, Permission>> SyncPermissionsAsync(List<PermissionDefinition> definitions, CancellationToken ct)
    {
        var existing = await db.Permissions.ToDictionaryAsync(p => p.Code, ct);
        foreach (var def in definitions)
        {
            if (existing.TryGetValue(def.Code, out var permission))
            {
                permission.Describe(def.Description);
                continue;
            }
            permission = new Permission(def.Code, def.Description);
            db.Permissions.Add(permission);
            existing[def.Code] = permission;
            logger.LogInformation("Thêm quyền mới {Permission}", def.Code);
        }
        return existing;
    }

    private async Task<Dictionary<string, Role>> EnsureRolesAsync(CancellationToken ct)
    {
        var roles = await db.Roles.Include(r => r.Permissions).ToDictionaryAsync(r => r.Name, ct);
        foreach (var (name, description) in SystemRoleDefinitions)
        {
            if (roles.ContainsKey(name)) continue;
            var role = new Role(name, description);
            db.Roles.Add(role);
            roles[name] = role;
        }
        return roles;
    }

    private static void GrantDefaults(
        Dictionary<string, Role> roles, Dictionary<string, Permission> permissions, List<PermissionDefinition> definitions)
    {
        foreach (var def in definitions)
        {
            var permissionId = permissions[def.Code].Id;
            roles[SystemRoles.Admin].Grant(permissionId);
            foreach (var roleName in def.DefaultRoles)
                if (roles.TryGetValue(roleName, out var role)) role.Grant(permissionId);
        }
    }

    private async Task EnsureAdminAsync(Role adminRole, CancellationToken ct)
    {
        if (await db.UserRoles.AnyAsync(ur => ur.RoleId == adminRole.Id, ct)) return;

        var seed = options.Value.Seed;
        if (string.IsNullOrWhiteSpace(seed.AdminPassword))
        {
            logger.LogWarning(
                "Chưa có tài khoản admin. Đặt mật khẩu bằng: dotnet user-secrets set \"Identity:Seed:AdminPassword\" \"...\" rồi khởi động lại.");
            return;
        }

        var normalized = User.Normalize(seed.AdminUserName);
        var admin = await db.Users.FirstOrDefaultAsync(u => u.NormalizedUserName == normalized, ct);
        if (admin is null)
        {
            admin = new User(seed.AdminUserName, seed.AdminFullName, email: null, customerId: null, branchId: null);
            admin.SetPassword(passwords.Hash(seed.AdminPassword), clock.GetUtcNow());
            db.Users.Add(admin);
        }
        admin.AssignRole(adminRole.Id);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Đã tạo tài khoản admin {UserName}", seed.AdminUserName);
    }
}
