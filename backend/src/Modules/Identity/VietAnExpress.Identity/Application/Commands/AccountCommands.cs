using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.Identity.Domain;
using VietAnExpress.Identity.Infrastructure;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Identity.Application.Commands;

// ---------- Đăng xuất ----------

internal sealed record LogoutCommand(string? RefreshToken) : IRequest<Result>;

internal sealed class LogoutHandler(IdentityDbContext db, ITokenService tokens, TimeProvider clock) : IRequestHandler<LogoutCommand, Result>
{
    public async Task<Result> Handle(LogoutCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(cmd.RefreshToken)) return Result.Success();

        var hash = tokens.HashRefreshToken(cmd.RefreshToken);
        var token = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (token is null) return Result.Success();

        token.Revoke(clock.GetUtcNow(), RevokeReasons.Logout);
        await db.SaveChangesAsync(ct);
        return Result.Success();
    }
}

// ---------- Đổi mật khẩu ----------

/// <param name="CurrentRefreshToken">Refresh token của thiết bị đang dùng — giữ lại phiên này, thu hồi các thiết bị khác.</param>
internal sealed record ChangePasswordCommand(string CurrentPassword, string NewPassword, string? CurrentRefreshToken) : IRequest<Result>;

internal sealed class ChangePasswordHandler(
    IdentityDbContext db, IPasswordService passwords, ITokenService tokens, ICurrentUser currentUser, TimeProvider clock)
    : IRequestHandler<ChangePasswordCommand, Result>
{
    public async Task<Result> Handle(ChangePasswordCommand cmd, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, ct);
        if (user is null) return IdentityErrors.SessionExpired;
        if (passwords.Verify(user.PasswordHash, cmd.CurrentPassword) == PasswordCheck.Failed)
            return IdentityErrors.WrongCurrentPassword;

        var now = clock.GetUtcNow();
        user.SetPassword(passwords.Hash(cmd.NewPassword), now);

        // Thiết bị khác phải đăng nhập lại (access token cũ còn hiệu lực tối đa vài phút tới khi hết hạn).
        var keepHash = string.IsNullOrEmpty(cmd.CurrentRefreshToken) ? null : tokens.HashRefreshToken(cmd.CurrentRefreshToken);
        var others = await db.RefreshTokens
            .Where(t => t.UserId == user.Id && t.RevokedAt == null && t.TokenHash != keepHash)
            .ToListAsync(ct);
        others.ForEach(t => t.Revoke(now, RevokeReasons.PasswordChanged));

        await db.SaveChangesAsync(ct);
        return Result.Success();
    }
}
