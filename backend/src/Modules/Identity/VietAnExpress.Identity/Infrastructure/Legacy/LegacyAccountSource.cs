using System.Security.Cryptography;
using System.Text;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace VietAnExpress.Identity.Infrastructure.Legacy;

/// <summary>
/// CẦU NỐI TẠM với hệ thống cũ: kiểm tra tài khoản khách trong dbo.TCustomer (Login_UserName / Login_Password).
/// Hệ thống cũ lưu mật khẩu dạng chữ thường (không băm) — chỉ ĐỌC để xác minh lần đăng nhập đầu,
/// sau đó tài khoản được chuyển sang identity.Users với mật khẩu đã băm. Không ghi / sửa bảng cũ.
/// Xoá thư mục Legacy khi mọi khách đã chuyển sang.
/// </summary>
internal interface ILegacyAccountSource
{
    /// <summary>CustomerID cũ nếu tên đăng nhập + mật khẩu đúng; null nếu sai hoặc không có.</summary>
    Task<LegacyAccount?> VerifyAsync(string userName, string password, CancellationToken cancellationToken);
}

internal sealed record LegacyAccount(long CustomerId, string UserName);

internal sealed class LegacyAccountSource(IdentityDbContext db) : ILegacyAccountSource
{
    public async Task<LegacyAccount?> VerifyAsync(string userName, string password, CancellationToken cancellationToken)
    {
        var rows = await db.Database.SqlQueryRaw<LegacyLoginRow>(
                """
                SELECT CustomerID, Login_UserName, Login_Password
                FROM dbo.TCustomer
                WHERE Login_UserName = @userName AND Login_Password IS NOT NULL AND Login_Password <> ''
                """,
                new SqlParameter("@userName", userName.Trim()))
            .ToListAsync(cancellationToken);

        // So sánh thời gian cố định để không lộ độ dài / ký tự đúng qua thời gian phản hồi.
        var match = rows.FirstOrDefault(r => FixedTimeEquals(r.Login_Password!, password));
        return match is null ? null : new LegacyAccount(match.CustomerID, match.Login_UserName!.Trim());
    }

    private static bool FixedTimeEquals(string expected, string actual) =>
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(actual));

    private sealed class LegacyLoginRow
    {
        public long CustomerID { get; init; }
        public string? Login_UserName { get; init; }
        public string? Login_Password { get; init; }
    }
}
