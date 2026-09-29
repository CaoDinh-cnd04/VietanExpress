using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VietAnExpress.Customers.Contracts;
using VietAnExpress.Identity.Application.Dtos;
using VietAnExpress.Identity.Domain;
using VietAnExpress.Identity.Infrastructure;
using VietAnExpress.Identity.Infrastructure.Legacy;
using VietAnExpress.SharedKernel.Authorization;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Identity.Application.Commands;

/// <param name="UserName">Tên đăng nhập hoặc email.</param>
/// <param name="Remember">Ghi nhớ đăng nhập trên thiết bị này.</param>
internal sealed record LoginCommand(string UserName, string Password, bool Remember, string? IpAddress) : IRequest<Result<AuthSession>>;

internal sealed class LoginHandler(
    IdentityDbContext db,
    IPasswordService passwords,
    SessionService sessions,
    ILegacyAccountSource legacyAccounts,
    ICustomersApi customers,
    IOptions<IdentityModuleOptions> options,
    TimeProvider clock,
    ILogger<LoginHandler> logger) : IRequestHandler<LoginCommand, Result<AuthSession>>
{
    // Hash giả để khi user không tồn tại vẫn tốn thời gian như khi sai mật khẩu (chống dò tên đăng nhập qua thời gian phản hồi).
    private static readonly Lazy<string> DummyHash = new(() => new PasswordService().Hash(Guid.NewGuid().ToString()));

    public async Task<Result<AuthSession>> Handle(LoginCommand cmd, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var login = User.Normalize(cmd.UserName);
        var user = await db.Users.FirstOrDefaultAsync(u => u.NormalizedUserName == login || u.NormalizedEmail == login, ct);

        if (user is null)
        {
            // Khách của hệ thống cũ đăng nhập lần đầu: xác minh với dbo.TCustomer rồi chuyển tài khoản sang.
            user = await MigrateLegacyAccountAsync(cmd, now, ct);
            if (user is null)
            {
                passwords.Verify(DummyHash.Value, cmd.Password);
                return IdentityErrors.InvalidCredentials;
            }
        }

        if (user.IsLockedOut(now))
            return IdentityErrors.LockedOut((int)Math.Ceiling((user.LockoutEnd!.Value - now).TotalMinutes));
        if (!user.IsActive)
            return IdentityErrors.AccountDisabled;

        var check = passwords.Verify(user.PasswordHash, cmd.Password);
        if (check == PasswordCheck.Failed)
        {
            var policy = options.Value;
            user.RecordFailedLogin(now, policy.MaxFailedLogins, TimeSpan.FromMinutes(policy.LockoutMinutes));
            await db.SaveChangesAsync(ct);
            return IdentityErrors.InvalidCredentials;
        }
        if (check == PasswordCheck.SuccessRehashNeeded)
            user.RehashPassword(passwords.Hash(cmd.Password));

        user.RecordSuccessfulLogin(now);
        var (session, _) = await sessions.StartAsync(user, cmd.Remember, cmd.IpAddress, ct);
        await db.SaveChangesAsync(ct);
        return session;
    }

    /// <summary>
    /// Đúng tài khoản cũ → chuyển hồ sơ khách sang module Customers (qua Contracts) và tạo tài khoản mới
    /// với mật khẩu đã băm, vai trò customer. Lần đăng nhập sau đi thẳng đường mới.
    /// </summary>
    private async Task<User?> MigrateLegacyAccountAsync(LoginCommand cmd, DateTimeOffset now, CancellationToken ct)
    {
        var legacy = await legacyAccounts.VerifyAsync(cmd.UserName, cmd.Password, ct);
        if (legacy is null) return null;

        var customer = await customers.ImportLegacyCustomerAsync(legacy.CustomerId, ct);
        var role = await db.Roles.FirstOrDefaultAsync(r => r.Name == SystemRoles.Customer, ct);
        if (customer is null || role is null) return null;

        var user = new User(legacy.UserName, customer.ContactName ?? customer.CompanyName, email: null, customer.Id, customer.BranchId);
        user.SetPassword(passwords.Hash(cmd.Password), now);
        user.AssignRole(role.Id);
        db.Users.Add(user);
        // Lưu ngay: bước tạo phiên phía sau đọc vai trò / quyền từ DB — chưa lưu thì token không có quyền nào.
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Chuyển tài khoản cũ {UserName} (khách {LegacyId}) sang hệ thống mới", legacy.UserName, legacy.CustomerId);
        return user;
    }
}
