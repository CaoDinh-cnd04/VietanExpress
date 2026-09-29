using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using VietAnExpress.Customers.Contracts;
using VietAnExpress.Identity.Application.Dtos;
using VietAnExpress.Identity.Domain;
using VietAnExpress.Identity.Infrastructure;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Identity.Application;

internal static class IdentityErrors
{
    public static readonly Error InvalidCredentials =
        Error.Unauthorized("INVALID_CREDENTIALS", "Sai tên đăng nhập hoặc mật khẩu");
    public static readonly Error AccountDisabled =
        Error.Unauthorized("ACCOUNT_DISABLED", "Tài khoản đã bị khoá, vui lòng liên hệ Việt An");
    public static Error LockedOut(int minutes) =>
        Error.Unauthorized("ACCOUNT_LOCKED", $"Đăng nhập sai nhiều lần, tài khoản tạm khoá. Thử lại sau {minutes} phút");
    public static readonly Error SessionExpired =
        Error.Unauthorized("SESSION_EXPIRED", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
    public static readonly Error WrongCurrentPassword =
        Error.Validation("WRONG_CURRENT_PASSWORD", "Mật khẩu hiện tại không đúng");
    public static readonly Error UserNameTaken = Error.Conflict("USERNAME_TAKEN", "Tên đăng nhập đã tồn tại");
    public static readonly Error EmailTaken = Error.Conflict("EMAIL_TAKEN", "Email đã được dùng cho tài khoản khác");
    public static Error RoleNotFound(string role) => Error.Validation("ROLE_NOT_FOUND", $"Vai trò '{role}' không tồn tại");
    public static readonly Error CustomerNotFound = Error.Validation("CUSTOMER_NOT_FOUND", "Không tìm thấy khách hàng");
    public static Error UserNotFound(Guid id) => Error.NotFound("USER_NOT_FOUND", $"Không tìm thấy tài khoản {id}");
}

/// <summary>Tạo phiên đăng nhập (access + refresh token) và thông tin người dùng — dùng chung cho đăng nhập và làm mới.</summary>
internal sealed class SessionService(
    IdentityDbContext db,
    ITokenService tokens,
    ICustomersApi customers,
    IOptions<JwtOptions> jwtOptions,
    TimeProvider clock)
{
    /// <summary>Thêm refresh token mới vào DbContext (người gọi SaveChanges). Trả phiên + entity token để nối chuỗi rotation.</summary>
    public async Task<(AuthSession Session, RefreshToken Token)> StartAsync(
        User user, bool persistent, string? ipAddress, CancellationToken ct)
    {
        var jwt = jwtOptions.Value;
        var (roles, permissions) = await LoadAccessAsync(user.Id, ct);
        var access = tokens.CreateAccessToken(user, roles, permissions);

        var now = clock.GetUtcNow();
        var (refresh, hash) = tokens.CreateRefreshToken();
        var expires = persistent ? now.AddDays(jwt.RefreshTokenDays) : now.AddHours(jwt.SessionRefreshTokenHours);
        var entity = new RefreshToken(user.Id, hash, now, expires, persistent, ipAddress);
        db.RefreshTokens.Add(entity);

        var sessionUser = await BuildSessionUserAsync(user, roles, permissions, ct);
        return (new AuthSession(sessionUser, access.Token, access.ExpiresAt, refresh, expires, persistent), entity);
    }

    public async Task<SessionUserDto> BuildSessionUserAsync(User user, CancellationToken ct)
    {
        var (roles, permissions) = await LoadAccessAsync(user.Id, ct);
        return await BuildSessionUserAsync(user, roles, permissions, ct);
    }

    private async Task<SessionUserDto> BuildSessionUserAsync(
        User user, IReadOnlyList<string> roles, IReadOnlyList<string> permissions, CancellationToken ct)
    {
        // Tài khoản khách hàng: lấy mã + tên công ty từ module Customers qua Contracts.
        var customer = user.CustomerId is { } customerId ? await customers.GetByIdAsync(customerId, ct) : null;

        return customer is null
            ? new SessionUserDto(user.Id, user.UserName, user.FullName, AccountTypes.Staff,
                CustomerCode: user.UserName, CompanyName: user.FullName, ContactName: user.FullName,
                user.Email, AvatarUrl: null, DefaultBranch: null, roles, permissions)
            : new SessionUserDto(user.Id, user.UserName, user.FullName, AccountTypes.Customer,
                customer.Code, customer.CompanyName, customer.ContactName ?? user.FullName,
                user.Email ?? customer.Email, AvatarUrl: null, DefaultBranch: null, roles, permissions);
    }

    /// <summary>Vai trò và quyền hiệu lực của user (bỏ qua vai trò đã xoá mềm).</summary>
    public async Task<(IReadOnlyList<string> Roles, IReadOnlyList<string> Permissions)> LoadAccessAsync(Guid userId, CancellationToken ct)
    {
        var roleIds = db.UserRoles.Where(ur => ur.UserId == userId).Select(ur => ur.RoleId);
        var activeRoles = db.Roles.Where(r => roleIds.Contains(r.Id));

        var roles = await activeRoles.Select(r => r.Name).OrderBy(n => n).ToListAsync(ct);
        var permissions = await db.RolePermissions
            .Where(rp => activeRoles.Select(r => r.Id).Contains(rp.RoleId))
            .Join(db.Permissions, rp => rp.PermissionId, p => p.Id, (_, p) => p.Code)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync(ct);

        return (roles, permissions);
    }
}
