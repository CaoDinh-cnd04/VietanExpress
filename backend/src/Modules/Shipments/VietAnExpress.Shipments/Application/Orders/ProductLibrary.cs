using System.Globalization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.Shipments.Infrastructure;
using VietAnExpress.Shipments.Infrastructure.Legacy;

namespace VietAnExpress.Shipments.Application.Orders;

/// <summary>1 mặt hàng để khai invoice nhanh — khớp <c>SavedProduct</c> của frontend (tất cả là chuỗi).</summary>
internal sealed record SavedProductDto(string Id, string DescEn, string DescVi, string Manufacturer, string Origin, string Hs, string Unit, string Price);

/// <summary>Invoice của 1 đơn gần đây — khớp <c>RecentInvoice</c> của frontend.</summary>
internal sealed record RecentInvoiceDto(string Bill, string Cnee, string Date, string Currency, IReadOnlyList<SavedProductDto> Items);

/// <summary>1 dòng hàng kèm đơn chứa nó (đã lọc theo khách).</summary>
internal sealed record CustomerInvoiceLine(LegacyInvoiceLine Line, LegacyOrder Order);

/// <summary>Dựng thư viện mặt hàng / invoice cũ từ dbo.MaVanDon_ChiTietHang. Hàm thuần — có test.</summary>
internal static class ProductLibrary
{
    /// <summary>
    /// Mỗi mặt hàng (cùng tên EN, VN, HS, xuất xứ, đơn vị, nhà sản xuất — không phân biệt hoa thường) lấy 1 dòng,
    /// dùng đơn giá lần khai gần nhất; mặt hàng dùng gần đây đứng trước.
    /// </summary>
    /// <param name="lines">Dòng hàng, mới nhất trước.</param>
    public static IReadOnlyList<SavedProductDto> Build(IEnumerable<LegacyInvoiceLine> lines, int max) =>
        lines
            .Where(l => !string.IsNullOrWhiteSpace(l.DescriptionEn) || !string.IsNullOrWhiteSpace(l.DescriptionVi))
            .Select(ToDto)
            .DistinctBy(p => string.Join('|', p.DescEn, p.DescVi, p.Hs, p.Origin, p.Unit, p.Manufacturer).ToUpperInvariant())
            .Take(max)
            .ToList();

    /// <summary>Gom dòng hàng theo đơn; đơn mới nhất trước.</summary>
    /// <param name="lines">Dòng hàng, mới nhất trước.</param>
    public static IReadOnlyList<RecentInvoiceDto> Recent(IEnumerable<CustomerInvoiceLine> lines, int max) =>
        lines
            .GroupBy(x => x.Order.Id)
            .Take(max)
            .Select(g =>
            {
                var o = g.First().Order;
                var items = g.OrderBy(x => x.Line.Id).Select(x => ToDto(x.Line)).ToList();
                return new RecentInvoiceDto(
                    LegacyOrderView.BillOf(o),
                    o.ConsigneeName?.Trim() ?? "",
                    o.CreateDate?.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture) ?? "",
                    Clean(g.First().Line.Currency) is { Length: > 0 } c ? c : Clean(o.Currency) is { Length: > 0 } oc ? oc : "USD",
                    items);
            })
            .ToList();

    public static SavedProductDto ToDto(LegacyInvoiceLine l) => new(
        l.Id.ToString(CultureInfo.InvariantCulture),
        Clean(l.DescriptionEn),
        Clean(l.DescriptionVi),
        Clean(l.Manufacturer),
        Clean(l.Origin) is { Length: > 0 } origin ? origin : "VN",
        Clean(l.HsCode),
        Clean(l.Unit) is { Length: > 0 } unit ? unit : "PCS",
        l.UnitPrice is { } price ? price.ToString("0.##", CultureInfo.InvariantCulture) : "");

    private static string Clean(string? value) => value?.Trim() ?? "";
}

// ---------- Thư viện mặt hàng (GET /catalog/products) ----------

internal sealed record GetProductLibraryQuery : IRequest<IReadOnlyList<SavedProductDto>>
{
    public const int MaxProducts = 300;

    /// <summary>Số dòng hàng gần nhất được xét — đủ cho khách gửi thường xuyên, không quét cả bảng.</summary>
    public const int ScanLines = 3000;
}

internal sealed class GetProductLibraryHandler(ShipmentsDbContext db, OrderAccess access)
    : IRequestHandler<GetProductLibraryQuery, IReadOnlyList<SavedProductDto>>
{
    public async Task<IReadOnlyList<SavedProductDto>> Handle(GetProductLibraryQuery q, CancellationToken ct)
    {
        var orders = access.Apply(db.LegacyOrders.AsNoTracking(), await access.ScopeAsync(ct));
        var lines = await db.LegacyInvoiceLines.AsNoTracking()
            .Where(l => l.OrderId != null && orders.Any(o => o.Id == l.OrderId))
            .OrderByDescending(l => l.Id)
            .Take(GetProductLibraryQuery.ScanLines)
            .ToListAsync(ct);
        return ProductLibrary.Build(lines, GetProductLibraryQuery.MaxProducts);
    }
}

// ---------- Invoice cũ (GET /invoices/recent) ----------

internal sealed record GetRecentInvoicesQuery(int? Limit) : IRequest<IReadOnlyList<RecentInvoiceDto>>
{
    public const int DefaultLimit = 20;
    public const int MaxLimit = 50;

    public int EffectiveLimit => Math.Clamp(Limit ?? DefaultLimit, 1, MaxLimit);
}

internal sealed class GetRecentInvoicesHandler(ShipmentsDbContext db, OrderAccess access)
    : IRequestHandler<GetRecentInvoicesQuery, IReadOnlyList<RecentInvoiceDto>>
{
    public async Task<IReadOnlyList<RecentInvoiceDto>> Handle(GetRecentInvoicesQuery q, CancellationToken ct)
    {
        var orders = access.Apply(db.LegacyOrders.AsNoTracking(), await access.ScopeAsync(ct));

        // Các đơn gần nhất có khai dòng hàng.
        var orderIds = await db.LegacyInvoiceLines.AsNoTracking()
            .Where(l => l.OrderId != null && orders.Any(o => o.Id == l.OrderId))
            .Select(l => l.OrderId!.Value)
            .Distinct()
            .OrderByDescending(id => id)
            .Take(q.EffectiveLimit)
            .ToListAsync(ct);
        if (orderIds.Count == 0) return [];

        var ids = orderIds.Select(id => (long)id).ToList();
        var byId = await orders.Where(o => ids.Contains(o.Id)).ToDictionaryAsync(o => o.Id, ct);
        var lines = await db.LegacyInvoiceLines.AsNoTracking()
            .Where(l => l.OrderId != null && orderIds.Contains(l.OrderId.Value))
            .OrderByDescending(l => l.OrderId).ThenBy(l => l.Id)
            .ToListAsync(ct);

        return ProductLibrary.Recent(
            lines.Where(l => byId.ContainsKey(l.OrderId!.Value)).Select(l => new CustomerInvoiceLine(l, byId[l.OrderId!.Value])),
            q.EffectiveLimit);
    }
}
