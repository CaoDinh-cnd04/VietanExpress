using System.Security.Claims;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Authorization;

namespace VietAnExpress.API.Infrastructure;

/// <summary>Đọc người dùng hiện tại từ claim của JWT trong HttpContext.</summary>
internal sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;
    public Guid? UserId => ReadGuid(VaClaimTypes.Subject);
    public string? UserName => Principal?.FindFirstValue(VaClaimTypes.Name);
    public Guid? BranchId => ReadGuid(VaClaimTypes.BranchId);
    public Guid? CustomerId => ReadGuid(VaClaimTypes.CustomerId);

    public bool HasPermission(string permission) => Principal?.HasClaim(VaClaimTypes.Permission, permission) == true;

    private Guid? ReadGuid(string claimType) =>
        Guid.TryParse(Principal?.FindFirstValue(claimType), out var value) ? value : null;
}
