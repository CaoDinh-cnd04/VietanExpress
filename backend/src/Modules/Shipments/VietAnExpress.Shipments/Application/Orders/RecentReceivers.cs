using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.Shipments.Infrastructure;

namespace VietAnExpress.Shipments.Application.Orders;

/// <summary>Người nhận khách đã gửi trước đây (lấy từ đơn trong dbo.MaVanDon) — để chọn lại khi tạo đơn, khỏi nhập lại.</summary>
internal sealed record RecentReceiverDto(
    string Company, string? Contact, string? Phone, string? PhoneCode, string? Email, string? TaxId,
    string? Country, string? City, string? State, string? PostalCode,
    string? Address1, string? Address2, string? Address3, string? IossNo, string? EoriNo, DateOnly? LastUsed);

/// <summary>Tên công ty người nhận chứa <paramref name="Q"/> — giống ô gợi ý của hệ thống cũ.</summary>
internal sealed record GetRecentReceiversQuery(string? Q) : IRequest<IReadOnlyList<RecentReceiverDto>>
{
    public const int Limit = 20;
    /// <summary>Số đơn gần nhất đọc lên để lọc trùng — đủ cho {Limit} người nhận khác nhau.</summary>
    public const int ScanOrders = 300;
}

/// <summary>Trong phạm vi đơn của khách (tài khoản con chỉ thấy đơn mình tạo), mới nhất trước, mỗi người nhận 1 dòng.</summary>
internal sealed class GetRecentReceiversHandler(ShipmentsDbContext db, OrderAccess access)
    : IRequestHandler<GetRecentReceiversQuery, IReadOnlyList<RecentReceiverDto>>
{
    public async Task<IReadOnlyList<RecentReceiverDto>> Handle(GetRecentReceiversQuery query, CancellationToken ct)
    {
        var q = query.Q?.Trim() ?? "";
        if (q.Length is 0 or > 100) return [];

        var rows = await access.Apply(db.LegacyOrders.AsNoTracking(), await access.ScopeAsync(ct))
            .Where(o => o.ConsigneeName != null && o.ConsigneeName.Contains(q))
            .OrderByDescending(o => o.Id)
            .Take(GetRecentReceiversQuery.ScanOrders)
            .Select(o => new RecentReceiverDto(
                o.ConsigneeName!, o.ConsigneeContactName, o.ConsigneePhone, o.ConsigneePhoneCode, o.ConsigneeEmail, o.ConsigneeVatTax,
                o.ConsigneeCountry, o.ConsigneeCity, o.ConsigneeState, o.ConsigneePostalCode,
                o.ConsigneeAddress1, o.ConsigneeAddress2, o.ConsigneeAddress3, o.ConsigneeIossNo, o.ConsigneeEoriNo,
                o.CreateDate == null ? null : DateOnly.FromDateTime(o.CreateDate.Value)))
            .ToListAsync(ct);
        return RecentReceivers.Distinct(rows, GetRecentReceiversQuery.Limit);
    }
}

/// <summary>Hàm thuần — có test.</summary>
internal static class RecentReceivers
{
    /// <summary>
    /// Bỏ dòng trùng (cùng tên công ty + số điện thoại + địa chỉ 1, không phân biệt hoa thường / khoảng trắng), giữ dòng mới nhất
    /// (danh sách đầu vào đã xếp mới nhất trước), cắt trường trống thừa.
    /// </summary>
    public static IReadOnlyList<RecentReceiverDto> Distinct(IEnumerable<RecentReceiverDto> rows, int limit) =>
        [.. rows
            .Where(r => !string.IsNullOrWhiteSpace(r.Company))
            .Select(Trim)
            .DistinctBy(r => (Key(r.Company), Key(r.Phone), Key(r.Address1)))
            .Take(limit)];

    private static string Key(string? value) =>
        string.Join(' ', (value ?? "").ToUpperInvariant().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    private static string? T(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static RecentReceiverDto Trim(RecentReceiverDto r) => r with
    {
        Company = r.Company.Trim(), Contact = T(r.Contact), Phone = T(r.Phone), PhoneCode = T(r.PhoneCode), Email = T(r.Email),
        TaxId = T(r.TaxId), Country = T(r.Country), City = T(r.City), State = T(r.State), PostalCode = T(r.PostalCode),
        Address1 = T(r.Address1), Address2 = T(r.Address2), Address3 = T(r.Address3), IossNo = T(r.IossNo), EoriNo = T(r.EoriNo)
    };
}
