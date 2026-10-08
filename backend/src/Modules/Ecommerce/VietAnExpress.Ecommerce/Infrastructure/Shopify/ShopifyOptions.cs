using System.ComponentModel.DataAnnotations;

namespace VietAnExpress.Ecommerce.Infrastructure.Shopify;

/// <summary>
/// Cấu hình app Shopify (section "Shopify") — lấy ở Shopify Dev Dashboard → app → Settings.
/// ClientSecret chỉ nằm ở backend: User Secrets khi dev, biến môi trường Shopify__ClientSecret khi chạy thật.
/// Để trống ClientId / ClientSecret thì tắt kết nối Shopify (portal báo chưa cấu hình).
/// </summary>
internal sealed class ShopifyOptions
{
    public const string Section = "Shopify";

    /// <summary>Client ID của app (công khai, nằm trong URL ủy quyền).</summary>
    public string ClientId { get; set; } = "";

    /// <summary>Client secret (shpss_…): đổi code lấy token và kiểm HMAC của callback / webhook.</summary>
    public string ClientSecret { get; set; } = "";

    /// <summary>Phiên bản GraphQL Admin API ghim theo quý, nâng ít nhất mỗi năm.</summary>
    [Required, RegularExpression(@"^\d{4}-(01|04|07|10)$")]
    public string ApiVersion { get; set; } = "2026-07";

    /// <summary>Quyền xin khi ủy quyền (ECOM_INTEGRATION.md §2).</summary>
    [Required]
    public string Scopes { get; set; } = "read_orders";

    /// <summary>
    /// Đường dẫn callback, ghép sau Company:PortalUrl (Vercel proxy /api sang backend).
    /// URL đầy đủ phải khai trong Allowed redirection URL(s) của app.
    /// </summary>
    [Required]
    public string CallbackPath { get; set; } = "/api/v1/ecom/oauth/shopify/callback";

    public bool IsConfigured => ClientId.Length > 0 && ClientSecret.Length > 0;
}

/// <summary>Khóa mã hóa token sàn lưu trong dbo.KetNoiTMDT (section "Ecommerce").</summary>
internal sealed class EcommerceOptions
{
    public const string Section = "Ecommerce";

    /// <summary>
    /// Khóa AES-256 dạng base64 (32 byte). Chỉ để trong User Secrets / biến môi trường Ecommerce__TokenEncryptionKey;
    /// mất hoặc đổi khóa thì mọi shop phải kết nối lại.
    /// </summary>
    public string TokenEncryptionKey { get; set; } = "";
}
