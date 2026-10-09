using System.Globalization;
using System.Text;
using VietAnExpress.Shipments.Infrastructure.Legacy;
using static VietAnExpress.Shipments.Application.Orders.Documents.Doc;

namespace VietAnExpress.Shipments.Application.Orders.Documents;

/// <summary>
/// Nhãn A6 (100 × 150 mm) theo mẫu hệ thống cũ (VietAnExpress - Bill Online 2.pdf): mỗi đơn 3 liên
/// (người gửi lưu, bưu cục gốc, bưu cục phát) rồi 1 shipping mark cho từng kiện — mỗi phần 1 trang A6.
/// </summary>
internal static class LabelA6
{
    private enum Slip { Shipper = 1, Origin = 2, Destination = 3 }

    /// <summary>QR tracking + mã vạch số bill của 1 đơn — dùng lại cho 3 liên và mọi shipping mark, không tạo lại mỗi trang.</summary>
    private sealed record OrderArt(string Qr, string HeadBarcode, string FootBarcode);

    public static string Render(OrderPrintModel m, CompanyInfo c, DateTime printedAt)
    {
        var art = new OrderArt(BillA4.Qr(BillA4.TrackingUrl(c, m.Bill)), Code128.Svg(m.Bill, 36), Code128.Svg(m.Bill, 30));
        var sb = new StringBuilder();
        foreach (var slip in Enum.GetValues<Slip>()) sb.Append(SlipHtml(m, c, slip, art));
        var pieces = BillA4.PieceList(m.Packages, m.Order.Pieces ?? 1);
        for (var i = 0; i < pieces.Count; i++) sb.Append(Mark(m, c, printedAt, i + 1, pieces.Count, pieces[i], art));
        return sb.ToString();
    }

    /// <summary>Mã tuyến in dưới số bill trên nhãn A6, giữ nguyên tên tuyến: "Chuyên tuyến|Taiwan" → "CT-Taiwan".</summary>
    public static string RouteLabel(string? serviceName)
    {
        var parts = (serviceName ?? "").Split('|', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return "";
        var short3 = BillA4.RouteCode(parts[0]);
        return parts.Length == 1 ? short3 : $"{short3}-{parts[1].Replace(" ", "")}";
    }

    /// <summary>Cân quy đổi in trên nhãn như hệ thống cũ: D×R×C / 5000, làm tròn lên 0,5 kg (4,52 → 5,0).</summary>
    public static decimal RoundUpHalf(decimal kg) => Math.Ceiling(kg * 2) / 2;

    /// <summary>1 dòng kích thước: "7.0 | 1*(31*27*27)=5.0" = cân thực | số kiện*(D*R*C)=cân quy đổi.</summary>
    public static string DimensionLine(PrintPackage p) =>
        string.Create(CultureInfo.InvariantCulture,
            $"{p.GrossKg:0.0} | {p.Qty}*({Qty(p.Length)}*{Qty(p.Width)}*{Qty(p.Height)})=<b>{RoundUpHalf(p.VolumeKg):0.0}</b>");

    // ---------------- 1 liên ----------------

    private static string SlipHtml(OrderPrintModel m, CompanyInfo c, Slip slip, OrderArt art)
    {
        var o = m.Order;
        var (addr1, addr2) = BillA4.SplitAddress(o.SenderAddress);
        var qrCaption = slip == Slip.Shipper ? "Quét QR để tracking" : m.Bill;
        var phone = BillA4.PhoneWithCode(o.ConsigneePhoneCode, o.ConsigneePhone);
        var tel = string.IsNullOrWhiteSpace(o.ConsigneeEmail) ? H(phone) : $"{H(phone)} | {H(o.ConsigneeEmail)}";

        var signs = slip == Slip.Destination
            ? $"""
              <div class="sign"><div>Nhân Viên Giao hàng <i>(Delivered by)</i></div><div class="sign-date"><b>Ngày, giờ</b> <i>(Date /time)</i>:</div></div>
              <div class="sign"><div>Chữ ký người nhận <i>(Signed By Receiver)</i></div><div class="sign-date"><b>Ngày, giờ</b>:<br><i>NV kinh doanh</i> :</div></div>
              """
            : $"""
              <div class="sign"><div>Chữ ký người gửi</div><div class="sign-date"><b>Ngày, giờ</b> <i>(Date /time)</i>: {Date(o.CreateDate)}</div></div>
              <div class="sign"><div>Nhân viên nhận hàng</div><div class="sign-date"><b>Ngày, giờ</b>:<br><i>NV kinh doanh</i> :</div></div>
              """;
        var slipName = slip switch
        {
            Slip.Shipper => "Liên 1: người gửi lưu",
            Slip.Origin => "Liên 2: lưu bưu cục gốc",
            _ => "Liên 3: lưu bưu cục Phát"
        };

        return $"""
            <section class="page a6">
              <div class="box">
                {Head(m, c, art.HeadBarcode, Code128.FitText(m.Bill, m.Bill))}
                <div class="bar">1. <i>(Sender's information)</i>:</div>
                <div class="sender">
                  <div class="qr"><div class="qr-frame">{art.Qr}</div><div class="qr-cap">{H(qrCaption)}</div></div>
                  <div class="lines">
                    <div class="ln">{H(o.SenderName)}</div>
                    <div class="ln">{H(addr1)}</div>
                    <div class="ln">{m.SenderCountryText}</div>
                    <div class="ln">{H(o.SenderContactName)}</div>
                    <div class="ln">{H(o.SenderPhone)}</div>
                    <div class="ln last">{H(addr2)}</div>
                  </div>
                </div>
                <div class="bar">2. (Consignee's information):</div>
                <div class="party">
                  <div><i>Co.</i> <b>: {H(o.ConsigneeName)}</b></div>
                  <div class="addr"><i>Add</i> <b>: {H(ConsigneeAddress(o))}</b></div>
                  <div class="indent"><b>{H(CityLine(o))}</b></div>
                  <div><i>Att</i> <b>: {H(o.ConsigneeContactName)}</b></div>
                  <div><i>Tel</i> <b>: {tel}</b></div>
                </div>
                <div class="bar">3. <i>(Shipment information)</i>:</div>
                <div class="ship"><span>(Content):</span><b>{H(o.GoodsName)}</b></div>
                <div class="ship"><span>(value invoice):</span><b>{H(BillA4.Value(o))}</b></div>
                {Packages(m)}
                <div class="signs">{signs}</div>
              </div>
              <div class="foot">
                <div>{(slip == Slip.Origin ? "<div class=\"total\">Tổng cước:</div>" : "")}<div class="slip-name">{slipName}</div></div>
                <div class="foot-awb">{art.FootBarcode}<div>{H(m.Bill)}</div></div>
              </div>
            </section>
            """;
    }

    private static string Packages(OrderPrintModel m)
    {
        var o = m.Order;
        var pk = m.Packages;
        var pieces = m.TotalPieces;
        var gross = m.TotalGrossKg;
        var vol = pk.Count > 0 ? pk.Sum(p => RoundUpHalf(p.VolumeKg)) : 0;
        const int maxLines = 3;
        // Kiện không khai D×R×C → không in dòng kích thước toàn số 0.
        var measured = pk.Where(p => p.Length * p.Width * p.Height > 0).ToList();
        var dims = measured.Take(maxLines).Select(DimensionLine).ToList();
        if (measured.Count > maxLines) dims.Add($"… +{measured.Count - maxLines}");

        return $"""
            <table class="pkg">
              <tr><th>Số kiện<br><i>(PCS)</i></th><th>TL thực<br><i>(G.W)</i></th><th>TL Qui Đổi<br><i>(Vol.W)</i></th>
                <th rowspan="2" class="dims"><div class="dims-title">(Dimensions)</div>{string.Concat(dims.Select(d => $"<div class=\"dim\">{d}</div>"))}</th></tr>
              <tr><td class="big">{pieces}</td><td class="big">{Kg1(gross)}</td><td class="big">{(pk.Count > 0 ? Kg1(vol) : "")}</td></tr>
            </table>
            """;
    }

    // ---------------- Shipping mark (1 / kiện) ----------------

    private static string Mark(OrderPrintModel m, CompanyInfo c, DateTime printedAt, int index, int total, PrintPackage? piece, OrderArt art)
    {
        var o = m.Order;
        var pieceNo = $"{m.Bill}/{index}";
        var gw = (piece?.WeightKg ?? 0).ToString("0.00", CultureInfo.InvariantCulture);
        var dim = piece is null ? "<b>0</b>*<b>0</b>*<b>0</b>" : $"<b>{Qty(piece.Length)}</b>*<b>{Qty(piece.Width)}</b>*<b>{Qty(piece.Height)}</b>";
        var phone = BillA4.PhoneWithCode(o.ConsigneePhoneCode, o.ConsigneePhone);

        return $"""
            <section class="page a6 mark">
              <div class="box">
                {Head(m, c, Code128.Svg(pieceNo, 36), $"<div class=\"awb-no\">{H(m.Bill)} <small>/{index}</small></div>")}
                <div class="m-title"><span>SHIPPING MARK<br><i>HAWB:</i></span><b>{H(m.Bill)}</b></div>
                <div class="bar center"><i>Ref no.:</i> {H(o.CustomerBill)}</div>
                <div class="m-dest">
                  <div class="qr-frame">{art.Qr}</div>
                  <div><div class="m-dest-lbl">DESTINATION</div><div class="m-dest-code">{H(BillA4.CountryCode(o.ConsigneeCountry))}</div></div>
                </div>
                <div class="m-pcs"><i>Pcs no:</i><b>{index} / {total}</b></div>
                <div class="bar"><i>Sender</i>:</div>
                <div class="party small">
                  <div><i>Co.</i> <b>: {H(o.SenderName)}</b></div>
                  <div><i>Att</i> <b>: {H(o.SenderContactName)}</b></div>
                </div>
                <div class="bar"><i>Consignee</i>:</div>
                <div class="party">
                  <div><i>Co.</i> <b>: {H(o.ConsigneeName)}</b></div>
                  <div class="addr"><i>Add</i><b>: {H(ConsigneeAddress(o))}</b></div>
                  <div class="indent"><b>{H(CityLine(o))}</b></div>
                  <div><i>Att</i> <b>: {H(o.ConsigneeContactName)}</b> | <i>Tel</i> <b>: {H(phone)}</b></div>
                </div>
              </div>
              <div class="m-foot">
                <div class="foot-awb">{Code128.Svg(pieceNo, 30)}<div>{H(pieceNo)}</div></div>
                <div>G.W: <b class="m-big">{gw}kg</b><br>DIM: {dim} cm</div>
              </div>
              <div class="m-date">{Date(printedAt)}</div>
            </section>
            """;
    }

    private static string Head(OrderPrintModel m, CompanyInfo c, string barcodeSvg, string awbHtml) => $"""
        <div class="head">
          <img class="logo" src="{BillA4.LogoDataUri.Value}" alt="Việt An Express">
          <div class="brand">
            <div class="brand-name">Viet An Express</div>
            <div><b class="k">Tel</b> : {H(c.Phone)}</div>
            <div><b class="k">Hotline</b> : <b>{H(c.Hotline)}</b></div>
            <div><b class="k">Website</b> : <i>{H(c.Website)}</i></div>
          </div>
          <div class="awb">{barcodeSvg}{awbHtml}<div class="route">{H(RouteLabel(m.Order.ServiceName))}</div></div>
        </div>
        """;

    private static string ConsigneeAddress(LegacyOrder o) => Join(" , ", o.ConsigneeAddress1, o.ConsigneeAddress2, o.ConsigneeAddress3);

    private static string CityLine(LegacyOrder o) => Join(", ", o.ConsigneeCity, o.ConsigneeState, o.ConsigneePostalCode, o.ConsigneeCountry);

    private static string Kg1(decimal value) => value.ToString("0.0", CultureInfo.InvariantCulture);

    // ---------------- CSS (100 × 150 mm) ----------------

    public const string Css = """
        @page { size: 100mm 150mm; margin: 0; }
        * { box-sizing: border-box; }
        /* Arial, chữ nhỏ nhất 8px (trước 6px): máy in nhiệt 203 dpi in rõ, không đứt nét. */
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 9px; color: #000; background: #e9ece9;
               -webkit-print-color-adjust: exact; print-color-adjust: exact; text-rendering: geometricPrecision; }
        .toolbar { position: sticky; top: 0; display: flex; gap: 12px; align-items: center; padding: 10px 16px; background: #1e6b2c; color: #fff; z-index: 1; font-size: 12px; }
        .toolbar button { padding: 6px 18px; border: 0; border-radius: 6px; background: #fff; color: #1e6b2c; font-weight: 700; cursor: pointer; }
        .toolbar .hint { opacity: .85; }
        .a6 { width: 100mm; height: 150mm; padding: 3mm; margin: 16px auto; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,.15);
              display: flex; flex-direction: column; overflow: hidden; break-after: page; page-break-after: always; }
        .a6:last-of-type { break-after: auto; page-break-after: auto; }
        .box { border: 1.2px solid #000; display: flex; flex-direction: column; min-height: 0; }
        .head { display: grid; grid-template-columns: 14mm 1fr 33mm; gap: 1.5mm; align-items: center; padding: 1mm 1.5mm; height: 17mm; border-bottom: 1px solid #000; }
        .logo { width: 14mm; height: 11mm; object-fit: contain; }
        .brand { font-size: 8px; line-height: 1.25; }
        .brand-name { font-size: 14px; font-weight: 700; line-height: 1.1; }
        .brand .k { display: inline-block; min-width: 7mm; font-size: 8px; }
        .awb { text-align: center; line-height: 1.1; }
        .awb .barcode { display: block; width: 100%; height: 7mm; }
        .awb .awb-text { display: block; width: 100%; height: 3.2mm; margin-top: .5mm; }
        .awb-no { font-size: 9px; font-weight: 700; white-space: nowrap; }
        .awb-no small { font-size: 9px; }
        .route { font-size: 8px; font-weight: 700; }
        .bar { background: none; font-weight: 700; padding: .3mm 1.5mm; border-top: 1px solid #000; border-bottom: 1px solid #000; }
        .bar.center { text-align: center; }
        .head + .bar, .m-title + .bar, .m-pcs + .bar { border-top: 0; }
        .sender { display: grid; grid-template-columns: 22mm 1fr; padding: .5mm 1.5mm .8mm 0; }
        .qr { display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .qr-frame { position: relative; width: 17mm; height: 17mm; padding: 1.2mm; }
        .qr-frame::before, .qr-frame::after { content: ""; position: absolute; top: 0; bottom: 0; width: 2.5mm; border: 1px solid #000; }
        .qr-frame::before { left: 0; border-right: 0; }
        .qr-frame::after { right: 0; border-left: 0; }
        .qr-frame svg { display: block; width: 100%; height: 100%; }
        .qr-cap { color: #e00; font-style: italic; font-size: 8px; }
        .lines { display: flex; flex-direction: column; min-width: 0; }
        .ln { border-bottom: .8px dashed #000; min-height: 3.6mm; line-height: 3.6mm; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ln.last { border-bottom: 0; }
        .party { padding: .5mm 1.5mm; line-height: 1.45; }
        .party > div { overflow: hidden; }
        .party .addr { max-height: 3.5em; }
        .party .indent { padding-left: 4mm; }
        .party.small { font-size: 8px; line-height: 1.3; }
        .ship { display: grid; grid-template-columns: 22mm 1fr; gap: 2mm; padding: .6mm 1.5mm; border-top: 1px solid #000; white-space: nowrap; overflow: hidden; }
        .ship span { text-align: right; }
        .ship b { overflow: hidden; text-overflow: ellipsis; }
        table.pkg { width: 100%; border-collapse: collapse; table-layout: fixed; border-top: 1.2px solid #000; }
        .pkg th, .pkg td { border: 1px solid #000; padding: .4mm .6mm; text-align: center; vertical-align: top; }
        .pkg tr > *:first-child { border-left: 0; }
        .pkg tr > *:last-child { border-right: 0; }
        .pkg th:not(.dims) { width: 13mm; font-size: 8px; border-bottom: 0; }
        .pkg td { border-top: 0; height: 8mm; vertical-align: middle; }
        .pkg .big { font-size: 15px; font-weight: 700; }
        .pkg .dims { font-weight: 400; text-align: left; }
        .dims-title { text-align: center; font-weight: 700; border-bottom: .8px dashed #000; }
        .dim { font-size: 8px; line-height: 1.4; }
        .signs { display: grid; grid-template-columns: 1fr 1fr; min-height: 13mm; border-top: 1px solid #000; }
        .sign { display: flex; flex-direction: column; justify-content: space-between; padding: .6mm 1.2mm; }
        .sign + .sign { border-left: 1px solid #000; }
        .sign-date { font-size: 8px; line-height: 1.25; }
        .foot { display: flex; justify-content: space-between; align-items: flex-end; padding: 1.5mm 1mm 0; }
        .total { font-size: 11px; font-weight: 700; }
        .slip-name { font-size: 8px; }
        .foot-awb { width: 30mm; text-align: center; font-size: 9px; line-height: 1.1; }
        .foot-awb .barcode { display: block; width: 100%; height: 6mm; }
        .m-title { display: flex; justify-content: center; align-items: center; gap: 2mm; padding: .8mm 0; border-bottom: 1px solid #000; }
        .m-title span { font-size: 10px; font-weight: 700; text-align: right; line-height: 1.15; }
        .m-title b { font-size: 26px; line-height: 1; }
        .m-dest { display: grid; grid-template-columns: 30mm 1fr; align-items: center; padding: 1.5mm; border-bottom: 1px solid #000; }
        .m-dest .qr-frame { margin: 0 auto; width: 22mm; height: 22mm; }
        .m-dest-lbl { font-weight: 700; font-size: 8px; }
        .m-dest-code { font-size: 38px; font-weight: 700; line-height: 1.05; }
        .m-pcs { display: grid; grid-template-columns: 22mm 1fr; align-items: center; padding: .5mm 3mm; font-size: 12px; font-weight: 700; border-bottom: 1px solid #000; }
        .m-pcs b { font-size: 30px; line-height: 1.1; }
        .m-foot { display: flex; justify-content: space-between; align-items: center; gap: 2mm; padding: 1.5mm 1mm 0; font-size: 8px; line-height: 1.5; }
        .m-big { font-size: 12px; }
        .m-date { text-align: center; font-size: 18px; font-weight: 700; margin-top: 3mm; }
        @media print {
          body { background: #fff; }
          .toolbar { display: none; }
          .a6 { margin: 0; box-shadow: none; }
        }
        """;
}
