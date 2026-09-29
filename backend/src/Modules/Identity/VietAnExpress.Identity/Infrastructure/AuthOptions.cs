using System.ComponentModel.DataAnnotations;

namespace VietAnExpress.Identity.Infrastructure;

/// <summary>
/// Cấu hình JWT (section "Jwt"). <see cref="Secret"/> KHÔNG để trong appsettings:
/// dev dùng user-secrets, deploy dùng biến môi trường Jwt__Secret.
/// </summary>
internal sealed class JwtOptions
{
    public const string Section = "Jwt";

    [Required] public string Issuer { get; init; } = "VietAnExpress";
    [Required] public string Audience { get; init; } = "VietAnExpress.Portal";

    /// <summary>Khoá ký HMAC-SHA256, tối thiểu 32 byte.</summary>
    [Required, MinLength(32)] public string Secret { get; init; } = string.Empty;

    [Range(1, 120)] public int AccessTokenMinutes { get; init; } = 15;

    /// <summary>Hạn refresh token khi chọn "Ghi nhớ đăng nhập".</summary>
    [Range(1, 90)] public int RefreshTokenDays { get; init; } = 14;

    /// <summary>Hạn refresh token khi KHÔNG ghi nhớ (cookie phiên, hết khi đóng trình duyệt).</summary>
    [Range(1, 72)] public int SessionRefreshTokenHours { get; init; } = 12;

    /// <summary>Cookie chỉ gửi qua HTTPS. Chỉ tắt khi dev bằng http://localhost.</summary>
    public bool SecureCookies { get; init; } = true;

    /// <summary>Refresh token dùng audience riêng — không dùng thay access token được và ngược lại.</summary>
    public string RefreshAudience => Audience + ".refresh";
}
