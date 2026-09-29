using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using VietAnExpress.Identity.Domain;
using VietAnExpress.SharedKernel.Authorization;

namespace VietAnExpress.Identity.Infrastructure;

internal sealed record AccessToken(string Token, DateTimeOffset ExpiresAt);

internal interface ITokenService
{
    AccessToken CreateAccessToken(User user, IReadOnlyCollection<string> roles, IReadOnlyCollection<string> permissions);

    /// <summary>Sinh refresh token ngẫu nhiên; trả cả token (gửi client) và hash (lưu DB).</summary>
    (string Token, string Hash) CreateRefreshToken();

    string HashRefreshToken(string token);
}

internal sealed class JwtTokenService(IOptions<JwtOptions> options, TimeProvider clock) : ITokenService
{
    private readonly JwtOptions _jwt = options.Value;
    private readonly JsonWebTokenHandler _handler = new();

    public AccessToken CreateAccessToken(User user, IReadOnlyCollection<string> roles, IReadOnlyCollection<string> permissions)
    {
        var now = clock.GetUtcNow();
        var expires = now.AddMinutes(_jwt.AccessTokenMinutes);

        var claims = new List<Claim>
        {
            new(VaClaimTypes.Subject, user.Id.ToString()),
            new(VaClaimTypes.Name, user.UserName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        if (user.BranchId is { } branchId) claims.Add(new(VaClaimTypes.BranchId, branchId.ToString()));
        if (user.CustomerId is { } customerId) claims.Add(new(VaClaimTypes.CustomerId, customerId.ToString()));
        claims.AddRange(roles.Select(r => new Claim(VaClaimTypes.Role, r)));
        // Quyền nằm trong token: đổi quyền có hiệu lực khi token được làm mới (tối đa AccessTokenMinutes).
        claims.AddRange(permissions.Select(p => new Claim(VaClaimTypes.Permission, p)));

        var token = _handler.CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = _jwt.Issuer,
            Audience = _jwt.Audience,
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = expires.UtcDateTime,
            SigningCredentials = new SigningCredentials(SigningKey(_jwt), SecurityAlgorithms.HmacSha256)
        });
        return new AccessToken(token, expires);
    }

    public (string Token, string Hash) CreateRefreshToken()
    {
        var token = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(64));
        return (token, HashRefreshToken(token));
    }

    public string HashRefreshToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public static SymmetricSecurityKey SigningKey(JwtOptions jwt) => new(Encoding.UTF8.GetBytes(jwt.Secret));
}

internal enum PasswordCheck { Failed, Success, SuccessRehashNeeded }

internal interface IPasswordService
{
    string Hash(string password);
    PasswordCheck Verify(string hash, string password);
}

/// <summary>Băm mật khẩu bằng PasswordHasher của ASP.NET Core Identity (PBKDF2-SHA512, có salt).</summary>
internal sealed class PasswordService : IPasswordService
{
    private static readonly PasswordHasher<object> Hasher = new();
    private static readonly object Owner = new();

    public string Hash(string password) => Hasher.HashPassword(Owner, password);

    public PasswordCheck Verify(string hash, string password)
    {
        if (string.IsNullOrEmpty(hash)) return PasswordCheck.Failed;
        return Hasher.VerifyHashedPassword(Owner, hash, password) switch
        {
            PasswordVerificationResult.Success => PasswordCheck.Success,
            PasswordVerificationResult.SuccessRehashNeeded => PasswordCheck.SuccessRehashNeeded,
            _ => PasswordCheck.Failed
        };
    }
}
