using VietAnExpress.SharedKernel.Domain;

namespace VietAnExpress.Identity.Domain;

/// <summary>Vai trò = nhóm quyền. Controller không kiểm tra vai trò, chỉ kiểm tra quyền.</summary>
internal sealed class Role : BaseEntity
{
    private readonly List<RolePermission> _permissions = [];

    private Role() { } // EF Core

    public Role(string name, string description)
    {
        Name = name.Trim().ToLowerInvariant();
        Description = description;
    }

    public string Name { get; private set; } = null!;
    public string Description { get; private set; } = null!;
    public IReadOnlyCollection<RolePermission> Permissions => _permissions.AsReadOnly();

    public bool Grant(Guid permissionId)
    {
        if (_permissions.Any(p => p.PermissionId == permissionId)) return false;
        _permissions.Add(new RolePermission(Id, permissionId));
        return true;
    }
}

internal sealed class RolePermission
{
    private RolePermission() { } // EF Core

    public RolePermission(Guid roleId, Guid permissionId)
    {
        RoleId = roleId;
        PermissionId = permissionId;
    }

    public Guid RoleId { get; private set; }
    public Guid PermissionId { get; private set; }
}

/// <summary>Danh mục quyền — được seed từ khai báo của các module (IPermissionProvider).</summary>
internal sealed class Permission
{
    private Permission() { } // EF Core

    public Permission(string code, string description)
    {
        Code = code;
        Description = description;
    }

    public Guid Id { get; private set; } = Guid.CreateVersion7();
    public string Code { get; private set; } = null!;
    public string Description { get; private set; } = null!;

    public void Describe(string description) => Description = description;
}
