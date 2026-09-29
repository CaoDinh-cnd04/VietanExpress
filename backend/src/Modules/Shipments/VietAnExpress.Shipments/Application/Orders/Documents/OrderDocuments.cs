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

/// <summary>1 dòng hàng trên invoice.</summary>
internal sealed record PrintItem(string Description, decimal Quantity, string Unit, decimal UnitPrice, string? HsCode, string? Origin)
{
    public decimal Amount => decimal.Round(Quantity * UnitPrice, 2, MidpointRounding.AwayFromZero);
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
            switch (doc)
            {
                case PrintDocs.BillA4: pages.Append(BillA4.Render(o, company)); break;
                case PrintDocs.Invoice: pages.Append(Invoice(o, company)); break;
                case PrintDocs.Cvck: pages.Append(Cvck(o, company, printedAtVn)); break;
                default: pages.Append(Labels(o, company)); break;
            }
        }

        var bills = string.Join(", ", orders.Select(o => o.Bill));
        return $$"""
            <!doctype html>
            <html lang="vi">
            <head>
            <meta charset="utf-8">
            <title>{{H(title)}} {{H(bills)}}</title>
            <style>{{(doc == PrintDocs.BillA4 ? BillA4.Css : Css(doc))}}</style>
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

    // ---------------- Nhãn A6 (1 nhãn / kiện) ----------------

    private static string Labels(OrderPrintModel m, CompanyInfo c)
    {
        var o = m.Order;
        var pieces = Math.Max(1, o.Pieces ?? 1);
        var sb = new StringBuilder();
        for (var i = 1; i <= pieces; i++)
        {
            sb.Append($$"""
                <section class="page a6">
                  <div class="label-head">
                    <span class="strong">{{H(c.EnglishName)}}</span>
                    <span class="service">{{H(Route(o))}}</span>
                  </div>
                  {{Code128.Svg(m.Bill, 70)}}
                  <div class="label-awb">{{H(m.Bill)}}</div>
                  <div class="label-dest">
                    <div class="muted">Gửi đến · Destination</div>
                    <div class="country">{{H(o.ConsigneeCountry)}}</div>
                    <div class="strong">{{H(Join(", ", o.ConsigneeCity, o.ConsigneePostalCode))}}</div>
                  </div>
                  <div class="label-to">
                    <div class="strong">{{H(o.ConsigneeName)}}</div>
                    <div>{{H(o.ConsigneeContactName)}} · {{H(o.ConsigneePhone)}}</div>
                    <div>{{H(Join(", ", o.ConsigneeAddress1, o.ConsigneeAddress2, o.ConsigneeAddress3))}}</div>
                  </div>
                  <div class="label-foot">
                    <div><span class="muted">Kiện</span><div class="big">{{i}}/{{pieces}}</div></div>
                    <div><span class="muted">Tổng cân</span><div class="big">{{Kg(o.WeightKg)}} kg</div></div>
                    <div><span class="muted">Ngày</span><div>{{Date(o.CreateDate)}}</div></div>
                  </div>
                  {{(string.IsNullOrWhiteSpace(o.CustomerBill) ? "" : $"<div class=\"muted ref\">Ref: {H(o.CustomerBill)}</div>")}}
                </section>
                """);
        }
        return sb.ToString();
    }

    // ---------------- Commercial invoice ----------------

    private static string Invoice(OrderPrintModel m, CompanyInfo c)
    {
        var o = m.Order;
        var lines = m.InvoiceLines;
        var currency = H(string.IsNullOrWhiteSpace(o.Currency) ? "USD" : o.Currency);
        var rows = new StringBuilder();
        var n = 0;
        foreach (var l in lines)
        {
            rows.Append(CultureInfo.InvariantCulture, $"""
                <tr><td class="num">{++n}</td><td>{H(l.Description)}</td><td>{H(l.HsCode)}</td><td>{H(l.Origin)}</td>
                <td class="num">{Qty(l.Quantity)}</td><td>{H(l.Unit)}</td><td class="num">{Money(l.UnitPrice)}</td><td class="num">{Money(l.Amount)}</td></tr>
                """);
        }
        var total = lines.Sum(l => l.Amount);

        return $$"""
            <section class="page a4">
              <header class="head">
                <div class="brand">
                  <div class="doc-title big-title">Commercial invoice</div>
                  <div class="muted">Hoá đơn thương mại</div>
                </div>
                <div class="awb">
                  {{Code128.Svg(m.Bill, 40)}}
                  <table class="grid mini">
                    <tr><th>Invoice no.</th><td>{{H(m.Bill)}}</td></tr>
                    <tr><th>Date</th><td>{{Date(o.CreateDate)}}</td></tr>
                    <tr><th>AWB</th><td>{{H(m.Bill)}}{{(Connect(o) is { Length: > 0 } cn ? " / " + H(cn) : "")}}</td></tr>
                  </table>
                </div>
              </header>

              <div class="parties">
                <div class="party">
                  <div class="party-title">Shipper / Exporter</div>
                  <div class="strong">{{H(o.SenderName)}}</div>
                  <div>{{H(o.SenderContactName)}}</div>
                  <div>{{H(o.SenderAddress)}}</div>
                  <div>Tel: {{H(o.SenderPhone)}}</div>
                  {{Optional("Tax ID", o.SenderTax)}}
                </div>
                <div class="party">
                  <div class="party-title">Consignee / Importer</div>
                  <div class="strong">{{H(o.ConsigneeName)}}</div>
                  <div>{{H(o.ConsigneeContactName)}}</div>
                  <div>{{H(Join(", ", o.ConsigneeAddress1, o.ConsigneeAddress2, o.ConsigneeAddress3))}}</div>
                  <div>{{H(Join(", ", o.ConsigneeCity, o.ConsigneeState, o.ConsigneePostalCode, o.ConsigneeCountry))}}</div>
                  <div>Tel: {{H(o.ConsigneePhone)}}</div>
                  {{Optional("Tax ID", o.ConsigneeVatTax)}}
                </div>
              </div>

              <table class="grid meta">
                <tr>
                  <th>Reason for export</th><td>{{H(o.ExportReason)}}</td>
                  <th>Country of destination</th><td>{{H(o.ConsigneeCountry)}}</td>
                </tr>
                <tr>
                  <th>Total pieces</th><td>{{o.Pieces ?? 1}}</td>
                  <th>Total weight</th><td>{{Kg(o.WeightKg)}} kg</td>
                </tr>
              </table>

              <table class="grid items">
                <tr><th>No.</th><th>Description of goods</th><th>HS code</th><th>Origin</th><th>Qty</th><th>Unit</th><th>Unit price ({{currency}})</th><th>Amount ({{currency}})</th></tr>
                {{rows}}
                <tr class="total"><td colspan="7">Total value ({{currency}})</td><td class="num">{{Money(total)}}</td></tr>
              </table>

              <p class="terms">
                I declare that the information on this invoice is true and correct, and that the contents of this shipment are as stated above.
              </p>
              <div class="signs two">
                <div></div>
                <div><div class="sign-title">Signature / Company stamp</div><div class="muted">Name, title, date</div></div>
              </div>
            </section>
            """;
    }

    // ---------------- Công văn cam kết ----------------

    private static string Cvck(OrderPrintModel m, CompanyInfo c, DateTime printedAt)
    {
        var o = m.Order;
        return $$"""
            <section class="page a4 letter">
              <div class="nation">
                <div class="strong">Cộng hoà xã hội chủ nghĩa Việt Nam</div>
                <div>Độc lập – Tự do – Hạnh phúc</div>
                <div class="rule"></div>
              </div>
              <div class="right muted">……………, ngày {{printedAt.Day}} tháng {{printedAt.Month}} năm {{printedAt.Year}}</div>

              <h1 class="letter-title">Công văn cam kết</h1>
              <p class="center">(V/v cam kết hàng hoá gửi đi nước ngoài — vận đơn số <strong>{{H(m.Bill)}}</strong>)</p>

              <p><strong>Kính gửi:</strong> {{H(c.Name)}}</p>

              <p>Tên đơn vị / cá nhân gửi hàng: <strong>{{H(o.SenderName)}}</strong></p>
              <p>Người liên hệ: {{H(o.SenderContactName)}} · Điện thoại: {{H(o.SenderPhone)}}</p>
              <p>Địa chỉ: {{H(o.SenderAddress)}}</p>
              {{(string.IsNullOrWhiteSpace(o.SenderTax) ? "<p>Mã số thuế / CCCD: ……………………………………</p>" : $"<p>Mã số thuế / CCCD: {H(o.SenderTax)}</p>")}}

              <p>Chúng tôi gửi lô hàng qua {{H(c.Name)}} với thông tin như sau:</p>
              <table class="grid">
                <tr><th>Số vận đơn</th><td>{{H(m.Bill)}}</td><th>Nước đến</th><td>{{H(o.ConsigneeCountry)}}</td></tr>
                <tr><th>Người nhận</th><td colspan="3">{{H(o.ConsigneeName)}} — {{H(Join(", ", o.ConsigneeAddress1, o.ConsigneeCity))}}</td></tr>
                <tr><th>Nội dung hàng</th><td colspan="3">{{H(o.GoodsName)}}</td></tr>
                <tr><th>Số kiện</th><td>{{o.Pieces ?? 1}}</td><th>Trọng lượng</th><td>{{Kg(o.WeightKg)}} kg</td></tr>
                <tr><th>Trị giá khai báo</th><td>{{Money(o.GoodsValue)}} {{H(o.Currency)}}</td><th>Mục đích</th><td>{{H(o.ExportReason)}}</td></tr>
              </table>

              <p>Chúng tôi xin cam kết:</p>
              <ol>
                <li>Hàng hoá trên đúng với nội dung đã khai báo, không phải hàng cấm, hàng hạn chế xuất khẩu, hàng nguy hiểm, chất cháy nổ, ma tuý, tiền, vàng bạc, đá quý hay văn hoá phẩm đồi truỵ theo quy định của pháp luật Việt Nam và nước nhận.</li>
                <li>Trị giá khai báo là trung thực; hàng không vi phạm quyền sở hữu trí tuệ.</li>
                <li>Chịu hoàn toàn trách nhiệm trước pháp luật và bồi thường mọi chi phí phát sinh (phạt, thuế, lưu kho, hoàn hàng…) nếu khai báo sai sự thật.</li>
              </ol>

              <div class="signs two">
                <div></div>
                <div>
                  <div class="sign-title">Người cam kết</div>
                  <div class="muted">(ký, ghi rõ họ tên, đóng dấu nếu là doanh nghiệp)</div>
                </div>
              </div>
            </section>
            """;
    }

    // ---------------- Tiện ích ----------------

    private static string H(string? value) => WebUtility.HtmlEncode(value?.Trim() ?? "");

    private static string Optional(string label, string? value) =>
        string.IsNullOrWhiteSpace(value) ? "" : $"<div>{H(label)}: {H(value)}</div>";

    private static string Join(string separator, params string?[] parts) =>
        string.Join(separator, parts.Select(p => p?.Trim()).Where(p => !string.IsNullOrEmpty(p)));

    private static string Route(LegacyOrder o) => o.ServiceName?.Replace("|", " - ") ?? "";

    private static string Connect(LegacyOrder o)
    {
        var connect = o.BillConnect?.Trim() ?? "";
        return connect == LegacyOrderView.BillOf(o) ? "" : connect;
    }

    private static string Date(DateTime? value) => value?.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture) ?? "";

    private static string Kg(decimal? value) => (value ?? 0).ToString("0.##", CultureInfo.InvariantCulture);

    private static string Qty(decimal value) => value.ToString("0.##", CultureInfo.InvariantCulture);

    private static string Money(decimal? value) => (value ?? 0).ToString("#,##0.00", CultureInfo.InvariantCulture);

    private static string Css(string doc) => (doc == PrintDocs.LabelA6
        ? "@page { size: 100mm 150mm; margin: 0; }"
        : "@page { size: A4; margin: 12mm; }") + """

        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, "Segoe UI", sans-serif; font-size: 12px; color: #111; background: #e9ece9; }
        .toolbar { position: sticky; top: 0; display: flex; gap: 12px; align-items: center; padding: 10px 16px; background: #1e6b2c; color: #fff; z-index: 1; }
        .toolbar button { padding: 6px 18px; border: 0; border-radius: 6px; background: #fff; color: #1e6b2c; font-weight: 700; cursor: pointer; }
        .toolbar .hint { opacity: .85; font-size: 12px; }
        .page { background: #fff; margin: 16px auto; padding: 14mm; box-shadow: 0 2px 10px rgba(0,0,0,.15); page-break-after: always; break-after: page; }
        .page:last-of-type { page-break-after: auto; break-after: auto; }
        .a4 { width: 210mm; min-height: 297mm; }
        .a6 { width: 100mm; height: 150mm; padding: 5mm; display: flex; flex-direction: column; gap: 3mm; overflow: hidden; }
        .muted { color: #555; }
        .strong { font-weight: 700; }
        .center { text-align: center; }
        .right { text-align: right; }
        .head { display: flex; justify-content: space-between; gap: 16px; padding-bottom: 10px; border-bottom: 2px solid #2e8b3e; margin-bottom: 12px; }
        .company { font-size: 15px; font-weight: 700; color: #1e6b2c; }
        .awb { width: 70mm; text-align: center; }
        .barcode { display: block; width: 100%; height: 16mm; }
        .a6 .barcode { height: 22mm; }
        .awb-no { font: 700 22px/1.2 Consolas, "Courier New", monospace; letter-spacing: 2px; }
        .doc-title { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
        .big-title { font-size: 22px; color: #1e6b2c; }
        table.grid { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .grid th, .grid td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
        .grid th { background: #eef5ef; font-weight: 700; white-space: nowrap; }
        .grid.mini th, .grid.mini td { padding: 3px 6px; font-size: 11px; }
        .num { text-align: right !important; white-space: nowrap; }
        .big { font-size: 18px; font-weight: 700; }
        .items tr.total td { font-weight: 700; background: #f6f6f6; }
        .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .party { border: 1px solid #999; padding: 8px 10px; min-height: 38mm; line-height: 1.5; }
        .party-title { font-weight: 700; color: #1e6b2c; border-bottom: 1px solid #ccc; margin-bottom: 4px; padding-bottom: 2px; }
        .terms { font-size: 11px; color: #333; margin: 8px 0 16px; }
        .signs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center; margin-top: 8px; }
        .signs.two { grid-template-columns: 1fr 1fr; }
        .signs > div { min-height: 32mm; }
        .sign-title { font-weight: 700; }
        .foot { margin-top: 16px; font-size: 10px; border-top: 1px dashed #bbb; padding-top: 6px; }
        .label-head { display: flex; justify-content: space-between; align-items: center; font-size: 11px; border-bottom: 2px solid #111; padding-bottom: 2mm; }
        .service { font-weight: 700; border: 1px solid #111; padding: 1px 6px; }
        .label-awb { text-align: center; font: 700 24px/1 Consolas, "Courier New", monospace; letter-spacing: 3px; }
        .label-dest { border: 2px solid #111; padding: 2mm 3mm; }
        .label-dest .country { font-size: 24px; font-weight: 800; line-height: 1.1; }
        .label-to { flex: 1; font-size: 12px; line-height: 1.45; overflow: hidden; }
        .label-foot { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; border-top: 2px solid #111; padding-top: 2mm; font-size: 11px; }
        .ref { font-size: 11px; }
        .letter { font-size: 14px; line-height: 1.6; }
        .letter p { margin: 6px 0; }
        .nation { text-align: center; margin-bottom: 6px; }
        .nation .rule { width: 50mm; margin: 4px auto 0; border-top: 1px solid #111; }
        .letter-title { text-align: center; font-size: 20px; margin: 18px 0 2px; }
        .letter .grid { font-size: 13px; margin: 8px 0; }
        @media print {
          body { background: #fff; }
          .toolbar { display: none; }
          .page { margin: 0; box-shadow: none; }
          .a4 { width: auto; min-height: auto; padding: 0; }
        }
        """;
}
