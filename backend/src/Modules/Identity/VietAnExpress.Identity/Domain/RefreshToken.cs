namespace VietAnExpress.Identity.Domain;

/// <summary>
/// Refresh token của 1 phiên đăng nhập. Chỉ lưu HASH (SHA-256) — lộ DB cũng không dùng được token.
/// Mỗi lần làm mới thì token cũ bị thu hồi và thay bằng token mới (rotation).
/// </summary>
internal sealed class RefreshToken
{
    private RefreshToken() { } // EF Core

    public RefreshToken(Guid userId, string tokenHash, DateTimeOffset createdAt, DateTimeOffset expiresAt, bool isPersistent, string? createdByIp)
    {
        UserId = userId;
        TokenHash = tokenHash;
        CreatedAt = createdAt;
        ExpiresAt = expiresAt;
        IsPersistent = isPersistent;
        CreatedByIp = createdByIp;
    }

    public Guid Id { get; private set; } = Guid.CreateVersion7();
    public Guid UserId { get; private set; }
    public string TokenHash { get; private set; } = null!;
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset ExpiresAt { get; private set; }

    /// <summary>true = "Ghi nhớ đăng nhập": cookie có hạn dùng; false = hết khi đóng trình duyệt.</summary>
    public bool IsPersistent { get; private set; }
    public string? CreatedByIp { get; private set; }

    public DateTimeOffset? RevokedAt { get; private set; }
    public string? RevokedReason { get; private set; }
    public Guid? ReplacedByTokenId { get; private set; }

    public bool IsActive(DateTimeOffset now) => RevokedAt is null && ExpiresAt > now;

    public void Revoke(DateTimeOffset now, string reason, Guid? replacedBy = null)
    {
        if (RevokedAt is not null) return;
        RevokedAt = now;
        RevokedReason = reason;
        ReplacedByTokenId = replacedBy;
    }
}

internal static class RevokeReasons
{
    public const string Rotated = "rotated";
    public const string Logout = "logout";
    public const string PasswordChanged = "password-changed";
    public const string UserDisabled = "user-disabled";
    public const string ReuseDetected = "reuse-detected";
}
