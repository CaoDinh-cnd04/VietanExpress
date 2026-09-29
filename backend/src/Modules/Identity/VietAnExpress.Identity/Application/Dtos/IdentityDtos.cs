namespace VietAnExpress.Identity.Application.Dtos;

/// <summary>
/// Người đang đăng nhập — GET /me. Khớp <c>SessionUser</c> của frontend (web/src/features/auth/types.ts):
/// customerCode, companyName, contactName, email, avatarUrl, defaultBranch; kèm quyền để UI ẩn/hiện chức năng.
/// Với nhân viên: customerCode = tên đăng nhập, companyName = họ tên.
/// </summary>
internal sealed record SessionUserDto(
    Guid UserId,
    string UserName,
    string FullName,
    string AccountType,
    string CustomerCode,
    string CompanyName,
    string? ContactName,
    string? Email,
    string? AvatarUrl,
    string? DefaultBranch,
    IReadOnlyList<string> Roles,
    IReadOnlyList<string> Permissions);

internal static class AccountTypes
{
    public const string Customer = "customer";
    public const string Staff = "staff";
}

/// <summary>Kết quả đăng nhập / làm mới phiên — controller quyết định trả qua cookie hay body.</summary>
internal sealed record AuthSession(
    SessionUserDto User,
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAt,
    bool IsPersistent);

internal sealed record UserDto(
    Guid Id,
    string UserName,
    string FullName,
    string? Email,
    bool IsActive,
    Guid? CustomerId,
    Guid? BranchId,
    IReadOnlyList<string> Roles,
    DateTimeOffset? LastLoginAt,
    DateTimeOffset CreatedAt);
