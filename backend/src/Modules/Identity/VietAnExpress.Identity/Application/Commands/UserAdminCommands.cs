using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.Customers.Contracts;
using VietAnExpress.Identity.Application.Dtos;
using VietAnExpress.Identity.Domain;
using VietAnExpress.Identity.Infrastructure;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Identity.Application.Commands;

// ---------- Tạo tài khoản ----------

/// <param name="CustomerId">Có giá trị = tài khoản portal của khách hàng này.</param>
/// <param name="Roles">Tên vai trò: admin / staff / customer…</param>
internal sealed record CreateUserCommand(
    string UserName,
    string FullName,
    string? Email,
    string Password,
    IReadOnlyList<string> Roles,
    Guid? CustomerId,
    Guid? BranchId) : IRequest<Result<UserDto>>;

internal sealed class CreateUserHandler(
    IdentityDbContext db, IPasswordService passwords, ICustomersApi customers, TimeProvider clock)
    : IRequestHandler<CreateUserCommand, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(CreateUserCommand cmd, CancellationToken ct)
    {
        var normalizedName = User.Normalize(cmd.UserName);
        if (await db.Users.IgnoreQueryFilters().AnyAsync(u => u.NormalizedUserName == normalizedName, ct))
            return IdentityErrors.UserNameTaken;

        var normalizedEmail = User.Normalize(cmd.Email);
        if (normalizedEmail is not null && await db.Users.IgnoreQueryFilters().AnyAsync(u => u.NormalizedEmail == normalizedEmail, ct))
            return IdentityErrors.EmailTaken;

        if (cmd.CustomerId is { } customerId && await customers.GetByIdAsync(customerId, ct) is null)
            return IdentityErrors.CustomerNotFound;

        var roleNames = cmd.Roles.Select(r => r.Trim().ToLowerInvariant()).Distinct().ToList();
        var roles = await db.Roles.Where(r => roleNames.Contains(r.Name)).ToListAsync(ct);
        if (roleNames.Except(roles.Select(r => r.Name)).FirstOrDefault() is { } missing)
            return IdentityErrors.RoleNotFound(missing);

        var user = new User(cmd.UserName, cmd.FullName, cmd.Email, cmd.CustomerId, cmd.BranchId);
        user.SetPassword(passwords.Hash(cmd.Password), clock.GetUtcNow());
        roles.ForEach(r => user.AssignRole(r.Id));

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return new UserDto(user.Id, user.UserName, user.FullName, user.Email, user.IsActive, user.CustomerId, user.BranchId,
            roles.Select(r => r.Name).Order().ToList(), user.LastLoginAt, user.CreatedAt);
    }
}

// ---------- Khoá / mở tài khoản ----------

internal sealed record SetUserActiveCommand(Guid Id, bool IsActive) : IRequest<Result>;

internal sealed class SetUserActiveHandler(IdentityDbContext db, TimeProvider clock) : IRequestHandler<SetUserActiveCommand, Result>
{
    public async Task<Result> Handle(SetUserActiveCommand cmd, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == cmd.Id, ct);
        if (user is null) return IdentityErrors.UserNotFound(cmd.Id);

        user.SetActive(cmd.IsActive);
        if (!cmd.IsActive)
        {
            // Khoá tài khoản: thu hồi mọi phiên để không làm mới được token nữa.
            var now = clock.GetUtcNow();
            var active = await db.RefreshTokens.Where(t => t.UserId == user.Id && t.RevokedAt == null).ToListAsync(ct);
            active.ForEach(t => t.Revoke(now, RevokeReasons.UserDisabled));
        }
        await db.SaveChangesAsync(ct);
        return Result.Success();
    }
}
