using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace VietAnExpress.Ecommerce.Infrastructure;

/// <summary>Nội dung tham số <c>state</c> gửi sang sàn và nhận lại ở callback.</summary>
/// <param name="PortalHost">Domain portal khách đang dùng — callback đưa khách về đúng domain đó.</param>
/// <param name="Nonce">Trùng cookie <see cref="OAuthState.CookieName"/> của trình duyệt đã bấm Kết nối.</param>
internal sealed record OAuthStatePayload(long CustomerId, string Channel, string Shop, string PortalHost, DateTimeOffset ExpiresAt, string Nonce);

/// <summary>
/// <c>state</c> tự chứa, ký HMAC — không cần bảng tạm. Cookie đăng nhập là SameSite=Strict nên không đi kèm callback từ sàn;
/// mã khách lấy từ state đã ký, còn cookie nonce (SameSite=Lax) buộc callback về đúng trình duyệt đã bắt đầu. Hàm thuần — có test.
/// </summary>
internal static class OAuthState
{
    public const string CookieName = "vae_ecom_oauth";
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(10);

    public static string NewNonce() => Base64Url(RandomNumberGenerator.GetBytes(16));

    public static string Protect(OAuthStatePayload p, byte[] key)
    {
        var body = string.Join('|', p.CustomerId.ToString(CultureInfo.InvariantCulture), p.Channel, p.Shop, p.PortalHost,
            p.ExpiresAt.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture), p.Nonce);
        var encoded = Base64Url(Encoding.UTF8.GetBytes(body));
        return encoded + "." + Base64Url(Sign(encoded, key));
    }

    /// <summary>Null khi sai chữ ký, sai dạng hoặc hết hạn.</summary>
    public static OAuthStatePayload? Unprotect(string? state, byte[] key, DateTimeOffset now)
    {
        var parts = state?.Split('.');
        if (parts is not { Length: 2 }) return null;
        try
        {
            if (!CryptographicOperations.FixedTimeEquals(Sign(parts[0], key), FromBase64Url(parts[1]))) return null;
            var f = Encoding.UTF8.GetString(FromBase64Url(parts[0])).Split('|');
            if (f.Length != 6) return null;
            var expires = DateTimeOffset.FromUnixTimeSeconds(long.Parse(f[4], CultureInfo.InvariantCulture));
            if (expires < now) return null;
            return new OAuthStatePayload(long.Parse(f[0], CultureInfo.InvariantCulture), f[1], f[2], f[3], expires, f[5]);
        }
        catch (FormatException)
        {
            return null;
        }
    }

    // Khóa ký state tách khỏi khóa mã hóa token bằng nhãn riêng.
    private static byte[] Sign(string data, byte[] key) =>
        HMACSHA256.HashData(HMACSHA256.HashData(key, "oauth-state"u8), Encoding.UTF8.GetBytes(data));

    private static string Base64Url(byte[] bytes) => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] FromBase64Url(string s)
    {
        var b = s.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(b.PadRight(b.Length + (4 - b.Length % 4) % 4, '='));
    }
}
