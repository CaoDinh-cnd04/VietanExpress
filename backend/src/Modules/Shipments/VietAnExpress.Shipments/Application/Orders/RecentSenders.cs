using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.Shipments.Infrastructure;

namespace VietAnExpress.Shipments.Application.Orders;

/// <summary>Người gửi đã dùng ở các đơn trước (dbo.MaVanDon) — tài khoản con gõ tên công ty / người gửi để chọn lại, khỏi nhập lại.</summary>
internal sealed record RecentSenderDto(
    string Company, string? Contact, string? Phone, string? Address, string? TaxId, string? Email, string? OriginalShipper, DateOnly? LastUsed);

/// <summary>Tên công ty hoặc người liên hệ của người gửi chứa <paramref name="Q"/> — tối đa <see cref="SuggestLimit"/>.</summary>
internal sealed record GetRecentSendersQuery(string? Q) : IRequest<IReadOnlyList<RecentSenderDto>>
{
    public const int SuggestLimit = 20;
    /// <summary>Số đơn gần nhất đọc lên để lọc trùng.</summary>
    public const int ScanOrders = 300;
}

/// <summary>Trong phạm vi đơn của khách (tài khoản con chỉ thấy đơn mình tạo), mới nhất trước, mỗi người gửi 1 dòng.</summary>
internal sealed class GetRecentSendersHandler(ShipmentsDbContext db, OrderAccess access)
    : IRequestHandler<GetRecentSendersQuery, IReadOnlyList<RecentSenderDto>>
{
    public async Task<IReadOnlyList<RecentSenderDto>> Handle(GetRecentSendersQuery query, CancellationToken ct)
    {
        var q = query.Q?.Trim() ?? "";
        if (q.Length is 0 or > 100) return [];

        var rows = await access.Apply(db.LegacyOrders.AsNoTracking(), await access.ScopeAsync(ct))
            .Where(o => o.SenderName != null && (o.SenderName.Contains(q) || o.SenderContactName!.Contains(q)))
            .OrderByDescending(o => o.Id)
            .Take(GetRecentSendersQuery.ScanOrders)
            .Select(o => new RecentSenderDto(
                o.SenderName!, o.SenderContactName, o.SenderPhone, o.SenderAddress, o.SenderTax, o.SenderEmail, o.ForwarderShipperName,
                o.CreateDate == null ? null : DateOnly.FromDateTime(o.CreateDate.Value)))
            .ToListAsync(ct);
        return RecentSenders.Distinct(rows, GetRecentSendersQuery.SuggestLimit);
    }
}

/// <summary>Hàm thuần — có test.</summary>
internal static class RecentSenders
{
    /// <summary>
    /// Gộp dòng trùng (cùng tên + điện thoại + địa chỉ lấy hàng, không phân biệt hoa thường / khoảng trắng) theo đơn mới nhất;
    /// ô nào đơn mới nhất để trống thì lấy từ lần gần nhất có giá trị.
    /// </summary>
    public static IReadOnlyList<RecentSenderDto> Distinct(IEnumerable<RecentSenderDto> rows, int limit) =>
        [.. rows
            .Where(r => !string.IsNullOrWhiteSpace(r.Company))
            .Select(Trim)
            .GroupBy(r => (Key(r.Company), Key(r.Phone), Key(r.Address)))
            .Select(g =>
            {
                var all = g.ToList();
                string? First(Func<RecentSenderDto, string?> field) => all.Select(field).FirstOrDefault(v => v is not null);
                return all[0] with
                {
                    Contact = First(r => r.Contact), TaxId = First(r => r.TaxId), Email = First(r => r.Email), OriginalShipper = First(r => r.OriginalShipper)
                };
            })
            .Take(limit)];

    private static string Key(string? value) =>
        string.Join(' ', (value ?? "").ToUpperInvariant().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    private static string? T(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static RecentSenderDto Trim(RecentSenderDto r) => r with
    {
        Company = r.Company.Trim(), Contact = T(r.Contact), Phone = T(r.Phone), Address = T(r.Address),
        TaxId = T(r.TaxId), Email = T(r.Email), OriginalShipper = T(r.OriginalShipper)
    };
}
