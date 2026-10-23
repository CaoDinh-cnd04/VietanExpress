using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.Ecommerce.Contracts;
using VietAnExpress.Ecommerce.Domain;
using VietAnExpress.Ecommerce.Infrastructure;
using VietAnExpress.Ecommerce.Infrastructure.Shopify;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Ecommerce.Application;

/// <summary>Nội dung file CSV khách tải lên (hiện nhận file "Export orders" của Shopify).</summary>
internal sealed record ImportOrdersCsvCommand(string? Csv) : IRequest<Result<CsvImportResult>>;

/// <summary>Khớp <c>CsvImportResult</c> của frontend — trả thẳng (không bọc trong data).</summary>
internal sealed record CsvImportResult(string Message, int ImportedCount, IReadOnlyList<CsvRowError> Errors);
internal sealed record CsvRowError(int Row, string Message);

internal sealed class OrderImportHandlers(EcommerceDbContext db, ICurrentUser user, TimeProvider clock) :
    IRequestHandler<ImportOrdersCsvCommand, Result<CsvImportResult>>
{
    private const int MaxCsvLength = 5 * 1024 * 1024;
    private const int MaxOrdersPerFile = 1000;

    private DateTime Now => VietnamTime.Now(clock);

    public async Task<Result<CsvImportResult>> Handle(ImportOrdersCsvCommand c, CancellationToken ct)
    {
        if (user.CustomerId is not { } customerId) return StoreErrors.NotLoggedIn;
        if (string.IsNullOrWhiteSpace(c.Csv)) return Error.Validation("ECOM_CSV_EMPTY", "File trống");
        if (c.Csv.Length > MaxCsvLength) return Error.Validation("ECOM_CSV_TOO_LARGE", "File quá lớn (tối đa 5 MB)");

        var rows = Csv.Parse(c.Csv);
        if (rows.Count < 2) return Error.Validation("ECOM_CSV_EMPTY", "File không có dòng đơn nào");
        if (!ShopifyExportParser.IsShopifyExport(rows[0]))
            return Error.Validation("ECOM_CSV_FORMAT", "File chưa đúng định dạng. Hiện nhận file Export orders của Shopify (Orders → Export → CSV for Excel…); mẫu 70 cột của Việt An đang hoàn thiện.");

        var parsed = ShopifyExportParser.Parse(rows);
        var errors = parsed.Errors.Select(e => new CsvRowError(e.Row, e.Message)).ToList();
        var wanted = parsed.Orders.Where(o => !o.Fulfilled && !o.Cancelled).Take(MaxOrdersPerFile).ToList();
        var skipped = parsed.Orders.Count(o => o.Fulfilled || o.Cancelled);

        var ids = wanted.Select(o => o.Order.PlatformOrderId).ToList();
        var existing = await db.MarketplaceOrders
            .Where(o => o.CustomerId == customerId).ShopifyOrdersIn(ids)
            .ToDictionaryAsync(o => o.PlatformOrderId!, ct);

        var now = Now;
        int added = 0, restored = 0, updated = 0, edited = 0, billed = 0;
        foreach (var o in wanted)
        {
            if (existing.TryGetValue(o.Order.PlatformOrderId, out var current))
            {
                // Khách chủ động nhập file → đơn đã xóa được khôi phục (khác đồng bộ tự động).
                if (current.Restore(o.Order, now)) restored++;
                else if (current.UpdateFrom(o.Order, now)) updated++;
                else if (current.Bill is not null) billed++;
                else edited++;
            }
            else
            {
                db.MarketplaceOrders.Add(MarketplaceOrder.Import(customerId, null, SalesChannelCodes.Shopify, o.Order, now, user.StaffId));
                added++;
            }
        }
        await db.SaveChangesAsync(ct);

        var parts = new List<string>();
        if (added > 0) parts.Add($"nhập {added} đơn mới");
        if (restored > 0) parts.Add($"khôi phục {restored} đơn đã xóa");
        if (updated > 0) parts.Add($"cập nhật {updated} đơn");
        if (edited > 0) parts.Add($"giữ nguyên {edited} đơn bạn đã sửa");
        if (billed > 0) parts.Add($"giữ nguyên {billed} đơn đã có bill");
        if (skipped > 0) parts.Add($"bỏ qua {skipped} đơn đã giao / đã hủy");
        var message = parts.Count == 0 ? "Không có đơn nào để nhập" : "Đã " + string.Join(", ", parts);
        return new CsvImportResult(message, added + restored, errors);
    }
}
