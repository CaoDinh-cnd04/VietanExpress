using ClosedXML.Excel;
using VietAnExpress.Shipments.Application.Orders;
using VietAnExpress.Shipments.Application.Orders.Documents;
using VietAnExpress.Shipments.Infrastructure.Legacy;
using Xunit;

namespace VietAnExpress.Shipments.Tests.Application;

public class OrderDocumentRendererTests
{
    private static readonly CompanyInfo Company = new();
    private static readonly DateTime Now = new(2026, 9, 29, 14, 30, 0);

    private static LegacyOrder Order(int pieces = 2, string consignee = "ACME LTD") => new()
    {
        Id = 1, OrderNumber = 90000001, BillConnect = "4681242285", CustomerBill = "PO-1",
        SenderName = "SCS CO., LTD", SenderPhone = "0909000000", SenderAddress = "14 Sam Sơn",
        ConsigneeName = consignee, ConsigneeCity = "LONDON", ConsigneeCountry = "United Kingdom", ConsigneeAddress1 = "1 King St",
        ServiceName = "DHL|Singapore", GoodsName = "Women dress", Pieces = pieces, WeightKg = 24, GoodsValue = 40, Currency = "USD",
        ExportReason = "GIFT", CreateDate = new DateTime(2026, 9, 29)
    };

    private static string Render(string doc, OrderPrintModel model) =>
        OrderDocumentRenderer.Render(doc, [model], Company, Now);

    [Theory]
    [InlineData(PrintDocs.BillA4)]
    [InlineData(PrintDocs.Invoice)]
    [InlineData(PrintDocs.Cvck)]
    [InlineData(PrintDocs.LabelA6)]
    public void Moi_chung_tu_co_so_van_don_ma_vach_va_tu_mo_hop_thoai_in(string doc)
    {
        var html = Render(doc, new OrderPrintModel(Order(), []));

        Assert.StartsWith("<!doctype html>", html);
        Assert.Contains("90000001", html);
        Assert.Contains("window.print()", html);
        if (doc != PrintDocs.Cvck) Assert.Contains("<svg", html);
    }

    [Fact]
    public void Du_lieu_khach_nhap_duoc_escape_HTML()
    {
        var html = Render(PrintDocs.BillA4, new OrderPrintModel(Order(consignee: "<script>alert(1)</script>"), []));

        Assert.DoesNotContain("<script>alert(1)</script>", html);
        Assert.Contains("&lt;script&gt;alert(1)&lt;/script&gt;", html);
    }

    [Fact]
    public void Bill_A4_ngang_moi_don_2_trang_3_lien_va_dieu_khoan()
    {
        var o = Order();
        o.ConsigneePhoneCode = "44";
        o.ConsigneePhone = "20 7946 0000";
        var packages = new[] { new PrintPackage(2, 50, 40, 30, 5) };
        var html = Render(PrintDocs.BillA4, new OrderPrintModel(o, [], packages));

        Assert.Contains("size: A4 landscape", html);
        Assert.Equal(2, html.Split("class=\"page sheet\"").Length - 1);
        Assert.Contains("Liên 1: người gửi lưu", html);
        Assert.Contains("Liên 2: lưu bưu cục gốc", html);
        Assert.Contains("Liên 3: lưu bưu cục Phát", html);
        Assert.Contains("ĐIỀU KHOẢN DỊCH VỤ", html);
        Assert.Contains("DHL-Sin", html);
        Assert.Contains("+44 20 7946 0000", html);
        Assert.Contains("40.00 USD", html);
        Assert.Contains("2 × 50 × 40 × 30 cm", html);
        Assert.Contains(">10<", html);  // G.W = 2 × 5
        Assert.Contains(">24<", html);  // Vol.W = 2 × 50×40×30 / 5000
        Assert.Contains("data:image/webp;base64,", html);
        Assert.Contains("viewBox", html); // QR tracking
    }

    [Theory]
    [InlineData("Chuyên tuyến|Singapore", "CT-Sin")]
    [InlineData("DHL|Singapore", "DHL-Sin")]
    [InlineData("UPS", "UPS")]
    [InlineData(null, "")]
    public void Ma_tuyen_in_duoi_so_bill(string? service, string expected) =>
        Assert.Equal(expected, BillA4.RouteCode(service));

    [Theory]
    [InlineData("65", "65 453778", "+65 65 453778")]
    [InlineData("+1", "+1 555 0100", "+1 555 0100")]
    [InlineData("", "0909", "0909")]
    public void So_dien_thoai_nguoi_nhan_kem_ma_nuoc(string code, string phone, string expected) =>
        Assert.Equal(expected, BillA4.PhoneWithCode(code, phone));

    [Fact]
    public void Dia_chi_nguoi_gui_dai_tach_2_dong_o_dau_phay()
    {
        var (l1, l2) = BillA4.SplitAddress("14 Sâm Sơn, Phường 4, Quận Tân Bình, TP. Hồ Chí Minh, Việt Nam");
        Assert.Equal("14 Sâm Sơn, Phường 4, Quận Tân Bình", l1);
        Assert.Equal("TP. Hồ Chí Minh, Việt Nam", l2);
        Assert.Equal(("Ngắn", ""), BillA4.SplitAddress("Ngắn"));
    }

    [Fact]
    public void Nhan_A6_in_moi_kien_mot_nhan()
    {
        var html = Render(PrintDocs.LabelA6, new OrderPrintModel(Order(pieces: 3), []));

        Assert.Contains("1/3", html);
        Assert.Contains("3/3", html);
        Assert.Equal(3, html.Split("class=\"page a6\"").Length - 1);
        Assert.Contains("size: 100mm 150mm", html);
    }

    [Fact]
    public void Invoice_don_cu_khong_co_chi_tiet_hang_thi_lay_1_dong_tu_gia_tri_tong()
    {
        var lines = new OrderPrintModel(Order(pieces: 2), []).InvoiceLines;

        var line = Assert.Single(lines);
        Assert.Equal("Women dress", line.Description);
        Assert.Equal(2, line.Quantity);
        Assert.Equal(20, line.UnitPrice);
        Assert.Equal(40, line.Amount);
    }

    [Fact]
    public void Invoice_don_portal_in_du_dong_hang()
    {
        var items = new[] { new PrintItem("Dress", 2, "PCS", 20, "6204", "Vietnam"), new PrintItem("Scarf", 3, "PCS", 5, null, "Vietnam") };
        var html = Render(PrintDocs.Invoice, new OrderPrintModel(Order(), items));

        Assert.Contains("Scarf", html);
        Assert.Contains("6204", html);
        Assert.Contains("55.00", html); // 40 + 15
    }
}

public class OrderSheetTests
{
    [Fact]
    public void File_Excel_co_tieu_de_dong_du_lieu_va_dong_tong()
    {
        var orders = new List<LegacyOrder>
        {
            new() { Id = 1, OrderNumber = 6010839, BillConnect = "4681242285", ConsigneeName = "A", ConsigneeCountry = "NZ", Pieces = 1, WeightKg = 1.5m,
                Pod = "09/01/2026 08:46 Delivered", CreateDate = new DateTime(2026, 1, 5) },
            new() { Id = 2, OrderNumber = 90000001, ConsigneeName = "B", ConsigneeCountry = "UK", Pieces = 2, WeightKg = 24, CreateDate = new DateTime(2026, 9, 29) }
        };
        var labels = new Dictionary<string, string> { ["ok"] = "Đã phát", ["wait"] = "Chưa đi" };

        var bytes = OrderSheet.Build(orders, new DateTime(2026, 9, 29), "SCS CO., LTD", null, null, new DateTime(2026, 9, 29, 14, 0, 0), labels);

        using var book = new XLWorkbook(new MemoryStream(bytes));
        var ws = book.Worksheet(1);
        Assert.Equal("Bảng kê gửi hàng", ws.Cell(1, 1).GetString());
        Assert.Contains("SCS CO., LTD", ws.Cell(2, 1).GetString());
        Assert.Equal("Số vận đơn", ws.Cell(4, 2).GetString());
        Assert.Equal("6010839", ws.Cell(5, 2).GetString());
        Assert.Equal("Đã phát", ws.Cell(5, 19).GetString());
        Assert.Equal("Chưa đi", ws.Cell(6, 19).GetString());
        Assert.Equal("Tổng cộng", ws.Cell(7, 13).GetString());
        Assert.Equal("SUM(O5:O6)", ws.Cell(7, 15).FormulaA1);
    }
}
