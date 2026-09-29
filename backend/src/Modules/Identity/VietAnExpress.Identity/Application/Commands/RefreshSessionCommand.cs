using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VietAnExpress.Identity.Application.Dtos;
using VietAnExpress.Identity.Domain;
using VietAnExpress.Identity.Infrastructure;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Identity.Application.Commands;

/// <summary>Đổi refresh token lấy access token mới (và refresh token mới — rotation).</summary>
internal sealed record RefreshSessionCommand(string RefreshToken, string? IpAddress) : IRequest<Result<AuthSession>>;

internal sealed class RefreshSessionHandler(
    IdentityDbContext db,
    ITokenService tokens,
    SessionService sessions,
    TimeProvider clock,
    ILogger<RefreshSessionHandler> logger) : IRequestHandler<RefreshSessionCommand, Result<AuthSession>>
{
    /// <summary>
    /// 2 tab cùng làm mới gần như đồng thời thì tab chậm sẽ gửi token vừa bị xoay vòng.
    /// Trong khoảng này chỉ từ chối, không coi là bị đánh cắp.
    /// </summary>
    private static readonly TimeSpan RotationGrace = TimeSpan.FromSeconds(30);

    public async Task<Result<AuthSession>> Handle(RefreshSessionCommand cmd, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var hash = tokens.HashRefreshToken(cmd.RefreshToken);
        var token = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (token is null) return IdentityErrors.SessionExpired;

        if (token.RevokedAt is { } revokedAt)
        {
            // Token đã thu hồi mà vẫn bị dùng lại sau thời gian ân hạn → khả năng bị lộ: thu hồi mọi phiên của user.
            if (token.RevokedReason != RevokeReasons.Rotated || now - revokedAt > RotationGrace)
            {
                logger.LogWarning("Refresh token bị dùng lại cho user {UserId} từ IP {Ip} — thu hồi mọi phiên", token.UserId, cmd.IpAddress);
                await RevokeAllAsync(token.UserId, now, ct);
            }
            return IdentityErrors.SessionExpired;
        }
        if (!token.IsActive(now)) return IdentityErrors.SessionExpired;

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == token.UserId, ct);
        if (user is null || !user.IsActive || user.IsLockedOut(now)) return IdentityErrors.SessionExpired;

        var (session, next) = await sessions.StartAsync(user, token.IsPersistent, cmd.IpAddress, ct);
        token.Revoke(now, RevokeReasons.Rotated, next.Id);
        await db.SaveChangesAsync(ct);
        return session;
    }

    private async Task RevokeAllAsync(Guid userId, DateTimeOffset now, CancellationToken ct)
    {
        var active = await db.RefreshTokens.Where(t => t.UserId == userId && t.RevokedAt == null).ToListAsync(ct);
        active.ForEach(t => t.Revoke(now, RevokeReasons.ReuseDetected));
        await db.SaveChangesAsync(ct);
    }
}
