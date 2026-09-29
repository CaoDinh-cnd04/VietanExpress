namespace VietAnExpress.Identity.Application.Dtos;

/// <summary>
/// Khách đang đăng nhập — GET /me. Khớp <c>SessionUser</c> của frontend (web/src/features/auth/types.ts):
/// customerCode, companyName, contactName, email, avatarUrl, defaultBranch; phone, address, taxCode để điền sẵn người gửi;
/// kèm quyền để UI ẩn/hiện chức năng. Hồ sơ lấy từ dbo.TCustomer.
/// </summary>
internal sealed record SessionUserDto(
    long CustomerId,
    string UserName,
    string FullName,
    string AccountType,
    string CustomerCode,
    string CompanyName,
    string? ContactName,
    string? Email,
    string? AvatarUrl,
    string? DefaultBranch,
    string? Phone,
    string? Address,
    string? TaxCode,
    IReadOnlyList<string> Roles,
    IReadOnlyList<string> Permissions);

internal static class AccountTypes
{
    public const string Customer = "customer";
}

/// <summary>Kết quả đăng nhập / làm mới phiên — controller quyết định trả qua cookie hay body.</summary>
internal sealed record AuthSession(
    SessionUserDto User,
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAt,
    bool IsPersistent);
