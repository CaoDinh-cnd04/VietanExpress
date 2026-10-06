using System.Globalization;
using System.Security.Cryptography;

namespace VietAnExpress.Identity.Infrastructure;

/// <summary>
/// Băm mật khẩu tài khoản con bằng PBKDF2-SHA256 (bảng mới, không phải dùng chung với hệ thống cũ như dbo.TCustomer).
/// Dạng lưu: <c>pbkdf2$&lt;số vòng&gt;$&lt;salt base64&gt;$&lt;hash base64&gt;</c>.
/// </summary>
internal static class StaffPasswordHasher
{
    private const string Prefix = "pbkdf2";
    private const int Iterations = 100_000;
    private const int SaltBytes = 16;
    private const int HashBytes = 32;

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltBytes);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, HashBytes);
        return string.Create(CultureInfo.InvariantCulture, $"{Prefix}${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}");
    }

    public static bool Verify(string storedHash, string password)
    {
        var parts = storedHash.Split('$');
        if (parts.Length != 4 || parts[0] != Prefix
            || !int.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out var iterations) || iterations <= 0)
            return false;
        try
        {
            var salt = Convert.FromBase64String(parts[2]);
            var expected = Convert.FromBase64String(parts[3]);
            var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);
            return CryptographicOperations.FixedTimeEquals(expected, actual);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
