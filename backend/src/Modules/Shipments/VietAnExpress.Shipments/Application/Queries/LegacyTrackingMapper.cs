using System.Globalization;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Application.Orders;
using VietAnExpress.Shipments.Infrastructure.Legacy;

namespace VietAnExpress.Shipments.Application.Queries;

/// <summary>Đổi 1 dòng dbo.MaVanDon thành kết quả tra cứu công khai cùng dạng với vận đơn mới.</summary>
internal static class LegacyTrackingMapper
{
    /// <summary>Mã người dùng nhập có khớp dòng này không (so với số VA, mã hãng, AWB, bill khách).</summary>
    public static bool Matches(LegacyOrder o, string bill) =>
        string.Equals(o.OrderNumber?.ToString(CultureInfo.InvariantCulture), bill, StringComparison.OrdinalIgnoreCase)
        || string.Equals(o.BillConnect?.Trim(), bill, StringComparison.OrdinalIgnoreCase)
        || string.Equals(o.Awb?.Trim(), bill, StringComparison.OrdinalIgnoreCase)
        || string.Equals(o.CustomerBill?.Trim(), bill, StringComparison.OrdinalIgnoreCase);

    public static PublicTrackResultDto ToResult(string bill, LegacyOrder o, DateTime todayVn)
    {
        var destination = string.Join(", ", new[] { o.ConsigneeCity, o.ConsigneeCountry }
            .Select(s => s?.Trim())
            .Where(s => !string.IsNullOrEmpty(s)));
        // "DHL|Singapore" → "DHL"
        var service = o.ServiceName?.Split('|')[0].Trim();

        return new PublicTrackResultDto(bill, Found: true,
            LegacyOrderStatus.Of(o, todayVn),
            string.IsNullOrEmpty(destination) ? null : destination,
            string.IsNullOrEmpty(service) ? null : service,
            // Trang công khai: không đưa tên người ký nhận.
            LegacyOrderView.Events(o, hideSigner: true).Select(e => new PublicTrackEventDto(e.Time, e.Title, e.Location)).ToList());
    }
}
