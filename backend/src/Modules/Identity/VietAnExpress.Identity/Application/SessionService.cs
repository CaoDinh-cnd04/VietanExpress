using VietAnExpress.Customers.Contracts;
using VietAnExpress.Identity.Application.Dtos;
using VietAnExpress.Identity.Infrastructure;
using VietAnExpress.SharedKernel.Authorization;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Identity.Application;

internal static class IdentityErrors
{
    public static readonly Error InvalidCredentials =
        Error.Unauthorized("INVALID_CREDENTIALS", "Sai tên đăng nhập hoặc mật khẩu");
    public static readonly Error SessionExpired =
        Error.Unauthorized("SESSION_EXPIRED", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
    public static readonly Error WrongCurrentPassword =
        Error.Validation("WRONG_CURRENT_PASSWORD", "Mật khẩu hiện tại không đúng");
}

/// <summary>
/// Tạo phiên đăng nhập (access + refresh token) cho khách ở dbo.TCustomer.
/// Quyền của khách khai báo trong code (các module, vai trò "customer") — không lưu DB.
/// </summary>
internal sealed class SessionService(ITokenService tokens, ICustomersApi customers, IEnumerable<IPermissionProvider> permissionProviders)
{
    private static readonly string[] Roles = [SystemRoles.Customer];

    public IReadOnlyList<string> Permissions { get; } = permissionProviders
        .SelectMany(p => p.GetPermissions())
        .Where(p => p.DefaultRoles.Contains(SystemRoles.Customer))
        .Select(p => p.Code)
        .Distinct()
        .Order()
        .ToList();

    /// <summary>Null nếu tài khoản không còn đăng nhập được (hồ sơ khách không còn / chưa có mật khẩu).</summary>
    public async Task<AuthSession?> StartAsync(CustomerLogin login, bool persistent, CancellationToken ct)
    {
        if (!login.HasPassword) return null;
        var user = await BuildUserAsync(login, ct);
        if (user is null) return null;

        var access = tokens.CreateAccessToken(login.CustomerId, user.UserName, Roles, Permissions);
        var refresh = tokens.CreateRefreshToken(login.CustomerId, tokens.PasswordStamp(login.CustomerId, login.Password!), persistent);
        return new AuthSession(user, access.Token, access.ExpiresAt, refresh.Token, refresh.ExpiresAt, persistent);
    }

    public async Task<SessionUserDto?> BuildUserAsync(CustomerLogin login, CancellationToken ct)
    {
        var customer = await customers.GetByIdAsync(login.CustomerId, ct);
        if (customer is null) return null;

        var userName = string.IsNullOrWhiteSpace(login.UserName) ? customer.Code : login.UserName.Trim();
        return new SessionUserDto(
            login.CustomerId, userName, customer.ContactName ?? customer.CompanyName, AccountTypes.Customer,
            customer.Code, customer.CompanyName, customer.ContactName, customer.Email,
            AvatarUrl: null, DefaultBranch: null, Roles, Permissions);
    }
}
