using System.Text.RegularExpressions;

namespace VietAnExpress.Identity.Domain;

/// <summary>
/// Trang tra cứu MyTracking riêng của khách (bảng <c>dbo.MyTrackingCauHinh</c> — người dùng đã đồng ý), 1 dòng / khách.
/// Cấu hình (thương hiệu, ảnh quảng cáo, nền, liên hệ) lưu nguyên JSON như frontend gửi (schema ở web/src/features/mytracking/schema.ts).
/// Đã xuất bản thì ai có link <c>/t/{slug}</c> cũng xem và tra cứu vận đơn được.
/// </summary>
internal sealed partial class MyTrackingPage
{
    public const int SlugMinLength = 3;
    public const int SlugMaxLength = 60;
    /// <summary>Tối đa 5 ảnh quảng cáo + logo + nền, mỗi ảnh ≤ 200 KB (base64 ~ 270 KB) → giới hạn 2 MB.</summary>
    public const int ConfigMaxBytes = 2 * 1024 * 1024;

    private MyTrackingPage() { } // EF Core

    public MyTrackingPage(long customerId, string slug, string configJson, bool isPublished, DateTime now)
    {
        CustomerId = customerId;
        CreateDate = now;
        Update(slug, configJson, isPublished, now);
        ModifyDate = null;
    }

    /// <summary>dbo.TCustomer.CustomerID — khóa chính.</summary>
    public long CustomerId { get; private set; }
    /// <summary>Đường dẫn công khai /t/{slug}: chữ thường, số, gạch ngang.</summary>
    public string Slug { get; private set; } = "";
    public string ConfigJson { get; private set; } = "{}";
    public bool IsPublished { get; private set; }
    public DateTime CreateDate { get; private set; }
    public DateTime? ModifyDate { get; private set; }

    public DateTime UpdatedAt => ModifyDate ?? CreateDate;

    public void Update(string slug, string configJson, bool isPublished, DateTime now)
    {
        Slug = slug;
        ConfigJson = configJson;
        IsPublished = isPublished;
        ModifyDate = now;
    }

    public static bool IsValidSlug(string slug) =>
        slug.Length is >= SlugMinLength and <= SlugMaxLength && SlugRegex().IsMatch(slug);

    /// <summary>Gợi ý đường dẫn từ mã khách: "SaigonbayHN" → "saigonbayhn"; ký tự khác chữ / số thành "-".</summary>
    public static string SuggestSlug(string customerCode)
    {
        var slug = NonSlugChars().Replace(customerCode.Trim().ToLowerInvariant(), "-").Trim('-');
        if (slug.Length > SlugMaxLength) slug = slug[..SlugMaxLength].TrimEnd('-');
        return slug.Length >= SlugMinLength ? slug : $"shop-{slug}".TrimEnd('-');
    }

    [GeneratedRegex("^[a-z0-9]+(-[a-z0-9]+)*$")]
    private static partial Regex SlugRegex();

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonSlugChars();
}
