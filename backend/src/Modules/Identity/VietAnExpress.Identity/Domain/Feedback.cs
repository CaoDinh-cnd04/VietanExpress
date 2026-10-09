namespace VietAnExpress.Identity.Domain;

/// <summary>Góp ý khách gửi từ portal (dbo.GopY) — admin Việt An xem ở trang /admin.</summary>
internal sealed class Feedback
{
    public const int MessageMaxLength = 4000;
    public const int ContactMaxLength = 200;
    public const int MaxImages = 5;
    public const int ImageMaxBytes = 5 * 1024 * 1024;
    public const int MinRating = 1;
    public const int MaxRating = 5;

    /// <summary>Định dạng ảnh nhận (trình duyệt hiển thị được).</summary>
    public static readonly IReadOnlySet<string> ImageTypes =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "image/jpeg", "image/png", "image/webp", "image/gif" };

    private Feedback() { } // EF Core

    public long Id { get; private set; }
    public long CustomerId { get; private set; }
    public string CustomerCode { get; private set; } = "";
    public string CompanyName { get; private set; } = "";
    /// <summary>Tài khoản con gửi (null = tài khoản chính).</summary>
    public long? StaffId { get; private set; }
    /// <summary>Tên đăng nhập của người gửi.</summary>
    public string SenderUserName { get; private set; } = "";
    public string Message { get; private set; } = "";
    public string? Contact { get; private set; }
    /// <summary>Khách chấm 1–5 sao (không bắt buộc).</summary>
    public int? Rating { get; private set; }
    public bool IsSeen { get; private set; }
    public DateTime CreateDate { get; private set; }
    public DateTime? SeenAt { get; private set; }
    public List<FeedbackImage> Images { get; private set; } = [];

    public static Feedback Create(long customerId, string customerCode, string companyName, long? staffId, string userName,
        string message, string? contact, int? rating, IEnumerable<FeedbackImage> images, DateTime now) => new()
    {
        CustomerId = customerId,
        CustomerCode = customerCode,
        CompanyName = companyName,
        StaffId = staffId,
        SenderUserName = userName,
        Message = message,
        Contact = string.IsNullOrWhiteSpace(contact) ? null : contact.Trim(),
        Rating = rating,
        CreateDate = now,
        Images = [.. images]
    };

    /// <summary>Admin đánh dấu đã xem (lần đầu).</summary>
    public bool MarkSeen(DateTime now)
    {
        if (IsSeen) return false;
        IsSeen = true;
        SeenAt = now;
        return true;
    }
}

/// <summary>1 ảnh đính kèm góp ý (dbo.GopY_HinhAnh) — lưu thẳng trong database (Render không giữ file trên ổ đĩa).</summary>
internal sealed class FeedbackImage
{
    private FeedbackImage() { } // EF Core

    public FeedbackImage(string fileName, string contentType, byte[] data)
    {
        FileName = fileName;
        ContentType = contentType;
        Size = data.Length;
        Data = data;
    }

    public long Id { get; private set; }
    public long FeedbackId { get; private set; }
    public string FileName { get; private set; } = "";
    public string ContentType { get; private set; } = "";
    public int Size { get; private set; }
    public byte[] Data { get; private set; } = [];
}
