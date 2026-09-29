using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace VietAnExpress.SharedKernel.Authorization;

/// <summary>
/// Controller đánh dấu <c>[HasPermission(ShipmentsPermissions.Create)]</c>.
/// Policy được tạo động theo tên quyền: yêu cầu đăng nhập + có claim "permission" tương ứng.
/// </summary>
public sealed class HasPermissionAttribute(string permission) : AuthorizeAttribute(permission);

public sealed class PermissionPolicyProvider(IOptions<AuthorizationOptions> options)
    : DefaultAuthorizationPolicyProvider(options)
{
    public override async Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        var policy = await base.GetPolicyAsync(policyName);
        return policy ?? new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .RequireClaim(VaClaimTypes.Permission, policyName)
            .Build();
    }
}
