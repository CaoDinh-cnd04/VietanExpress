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
}

/// <summary>Chính sách đăng nhập + tài khoản admin seed ban đầu (section "Identity").</summary>
internal sealed class IdentityModuleOptions
{
    public const string Section = "Identity";

    [Range(3, 20)] public int MaxFailedLogins { get; init; } = 5;
    [Range(1, 1440)] public int LockoutMinutes { get; init; } = 15;

    public SeedOptions Seed { get; init; } = new();

    internal sealed class SeedOptions
    {
        public string AdminUserName { get; init; } = "admin";
        public string AdminFullName { get; init; } = "Quản trị hệ thống";

        /// <summary>Mật khẩu admin lần đầu — chỉ đặt qua user-secrets / biến môi trường. Trống = không seed admin.</summary>
        public string? AdminPassword { get; init; }
    }
}
