using System.Globalization;

namespace VietAnExpress.SharedKernel.Application;

/// <summary>
/// DB và API lưu/trả giờ UTC (ISO 8601). Chỉ khi cần chuỗi hiển thị sẵn cho người dùng
/// (vd tra cứu công khai) mới đổi sang giờ Việt Nam dạng dd/MM/yyyy HH:mm.
/// </summary>
public static class VietnamTime
{
    private static readonly TimeZoneInfo Zone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");

    public static DateTimeOffset ToVietnam(DateTimeOffset utc) => TimeZoneInfo.ConvertTime(utc, Zone);

    /// <summary>0 giờ ngày <paramref name="date"/> theo giờ Việt Nam, đổi ra UTC — dùng cho bộ lọc từ ngày / đến ngày.</summary>
    public static DateTimeOffset StartOfDayUtc(DateOnly date)
    {
        var local = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        return new DateTimeOffset(local, Zone.GetUtcOffset(local)).ToUniversalTime();
    }

    public static string Format(DateTimeOffset utc) =>
        ToVietnam(utc).ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture);
}
