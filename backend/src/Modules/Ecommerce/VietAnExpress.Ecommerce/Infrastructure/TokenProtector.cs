using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using VietAnExpress.Ecommerce.Infrastructure.Shopify;

namespace VietAnExpress.Ecommerce.Infrastructure;

/// <summary>
/// Mã hóa token sàn trước khi lưu dbo.KetNoiTMDT: AES-256-GCM, dạng "v1:" + base64(nonce | ciphertext | tag).
/// Khóa: Ecommerce:TokenEncryptionKey (cũng dùng làm gốc ký <see cref="OAuthState"/>).
/// </summary>
internal sealed class TokenProtector(IOptions<EcommerceOptions> options)
{
    private const string Prefix = "v1:";
    private const int NonceSize = 12;
    private const int TagSize = 16;

    public bool IsConfigured => TryKey() is not null;

    /// <summary>Khóa 32 byte — ném lỗi khi thiếu hoặc sai dạng (kiểm <see cref="IsConfigured"/> trước).</summary>
    public byte[] Key => TryKey() ?? throw new InvalidOperationException("Ecommerce:TokenEncryptionKey phải là base64 của 32 byte.");

    public string Protect(string plain)
    {
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var data = Encoding.UTF8.GetBytes(plain);
        var output = new byte[NonceSize + data.Length + TagSize];
        using var aes = new AesGcm(Key, TagSize);
        aes.Encrypt(nonce, data, output.AsSpan(NonceSize, data.Length), output.AsSpan(NonceSize + data.Length));
        nonce.CopyTo(output, 0);
        return Prefix + Convert.ToBase64String(output);
    }

    public string Unprotect(string stored)
    {
        if (!stored.StartsWith(Prefix, StringComparison.Ordinal)) throw new CryptographicException("Token không đúng định dạng đã mã hóa.");
        var input = Convert.FromBase64String(stored[Prefix.Length..]);
        var length = input.Length - NonceSize - TagSize;
        var plain = new byte[length];
        using var aes = new AesGcm(Key, TagSize);
        aes.Decrypt(input.AsSpan(0, NonceSize), input.AsSpan(NonceSize, length), input.AsSpan(NonceSize + length), plain);
        return Encoding.UTF8.GetString(plain);
    }

    private byte[]? TryKey()
    {
        try
        {
            var key = Convert.FromBase64String(options.Value.TokenEncryptionKey);
            return key.Length == 32 ? key : null;
        }
        catch (FormatException)
        {
            return null;
        }
    }
}
