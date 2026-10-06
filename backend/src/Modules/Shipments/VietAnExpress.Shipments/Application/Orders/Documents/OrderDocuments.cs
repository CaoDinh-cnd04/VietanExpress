using System.Globalization;
using System.Net;
using System.Text;
using VietAnExpress.Shipments.Infrastructure.Legacy;

namespace VietAnExpress.Shipments.Application.Orders.Documents;

/// <summary>Loại chứng từ in — khớp PRINT_DOCUMENTS của frontend (web/src/features/orders/constants.ts).</summary>
internal static class PrintDocs
{
    public const string BillA4 = "bill-a4";
    public const string Invoice = "invoice";
    public const string Cvck = "cvck";
    public const string LabelA6 = "label-a6";

    public static readonly string[] All = [BillA4, Invoice, Cvck, LabelA6];
}

/// <summary>1 dòng hàng trên invoice / CVCK. <paramref name="Description"/> là tên tiếng Anh.</summary>
internal sealed record PrintItem(string Description, decimal Quantity, string Unit, decimal UnitPrice, string? HsCode, string? Origin,
    string? DescriptionVi = null, string? Manufacturer = null)
{
    public decimal Amount => decimal.Round(Quantity * UnitPrice, 2, MidpointRounding.AwayFromZero);

    /// <summary>"Tên tiếng Anh / Tên tiếng Việt" như mẫu hệ thống cũ; thiếu tên Việt thì chỉ tên Anh.</summary>
    public string Name(string separator = " / ") =>
        string.IsNullOrWhiteSpace(DescriptionVi) ? Description.Trim() : $"{Description.Trim()}{separator}{DescriptionVi.Trim()}";
}

/// <summary>
/// Dữ liệu 1 đơn để in: dòng dbo.MaVanDon + dòng hàng và dòng kiện (nếu đơn tạo trên portal còn giữ form).
/// </summary>
internal sealed record OrderPrintModel(LegacyOrder Order, IReadOnlyList<PrintItem> Items, IReadOnlyList<PrintPackage>? PackageLines = null)
{
    public IReadOnlyList<PrintPackage> Packages => PackageLines ?? [];

    public string Bill => LegacyOrderView.BillOf(Order);

    /// <summary>Không có chi tiết hàng (đơn hệ thống cũ) → 1 dòng từ tên hàng, số kiện, giá trị tổng.</summary>
    public IReadOnlyList<PrintItem> InvoiceLines
    {
        get
        {
            if (Items.Count > 0) return Items;
            var qty = Math.Max(1, Order.Pieces ?? 1);
            var total = Order.GoodsValue ?? 0;
            return [new PrintItem(Order.GoodsName ?? "Goods", qty, "PCS", decimal.Round(total / qty, 2), null, "Vietnam")];
        }
    }
}

/// <summary>
/// Dựng trang HTML để in bill A4, invoice, công văn cam kết, nhãn A6. Hàm thuần — có test.
/// Mọi dữ liệu đơn đều được HtmlEncode (dữ liệu do khách nhập). Trang tự mở hộp thoại in khi tải xong.
/// </summary>
internal static class OrderDocumentRenderer
{
    public static string Render(string doc, IReadOnlyList<OrderPrintModel> orders, CompanyInfo company, DateTime printedAtVn)
    {
        var title = doc switch
        {
            PrintDocs.BillA4 => "Vận đơn",
            PrintDocs.Invoice => "Commercial invoice",
            PrintDocs.Cvck => "Công văn cam kết",
            PrintDocs.LabelA6 => "Nhãn kiện hàng",
            _ => throw new ArgumentOutOfRangeException(nameof(doc), doc, null)
        };

        var pages = new StringBuilder();
        foreach (var o in orders)
        {
            pages.Append(doc switch
            {
                PrintDocs.BillA4 => BillA4.Render(o, company, printedAtVn),
                PrintDocs.Invoice => CommercialInvoice.Render(o),
                PrintDocs.Cvck => CommitmentLetter.Render(o, printedAtVn),
                _ => LabelA6.Render(o, company, printedAtVn)
            });
        }

        var bills = string.Join(", ", orders.Select(o => o.Bill));
        return $$"""
            <!doctype html>
            <html lang="vi">
            <head>
            <meta charset="utf-8">
            <title>{{H(title)}} {{H(bills)}}</title>
            <style>{{Css(doc)}}</style>
            </head>
            <body>
            <div class="toolbar">
              <strong>{{H(title)}}</strong> · {{orders.Count}} đơn
              <button type="button" onclick="window.print()">In</button>
              <span class="hint">Chọn khổ giấy {{(doc == PrintDocs.LabelA6 ? "100 × 150 mm (A6)" : doc == PrintDocs.BillA4 ? "A4 ngang (landscape)" : "A4")}}, tắt "Headers and footers" trong hộp thoại in.</span>
            </div>
            {{pages}}
            <script>window.addEventListener('load', function () { setTimeout(function () { window.focus(); window.print(); }, 300); });</script>
            </body>
            </html>
            """;
    }

    private static string H(string? value) => WebUtility.HtmlEncode(value?.Trim() ?? "");

    /// <summary>Bill A4 và nhãn A6 có CSS riêng; invoice / CVCK dùng khung trang A4 dọc chung + CSS riêng của từng mẫu.</summary>
    private static string Css(string doc) => doc switch
    {
        PrintDocs.BillA4 => BillA4.Css,
        PrintDocs.LabelA6 => LabelA6.Css,
        PrintDocs.Invoice => A4Css + CommercialInvoice.Css,
        _ => A4Css + CommitmentLetter.Css
    };

    private const string A4Css = """
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, "Segoe UI", sans-serif; font-size: 12px; color: #111; background: #e9ece9; }
        .toolbar { position: sticky; top: 0; display: flex; gap: 12px; align-items: center; padding: 10px 16px; background: #1e6b2c; color: #fff; z-index: 1; }
        .toolbar button { padding: 6px 18px; border: 0; border-radius: 6px; background: #fff; color: #1e6b2c; font-weight: 700; cursor: pointer; }
        .toolbar .hint { opacity: .85; font-size: 12px; }
        .page { background: #fff; margin: 16px auto; padding: 14mm; box-shadow: 0 2px 10px rgba(0,0,0,.15); page-break-after: always; break-after: page; }
        .page:last-of-type { page-break-after: auto; break-after: auto; }
        .a4 { width: 210mm; min-height: 297mm; }
        @media print {
          body { background: #fff; }
          .toolbar { display: none; }
          .page { margin: 0; box-shadow: none; }
          .a4 { width: auto; min-height: auto; padding: 0; }
        }
        """;
}
