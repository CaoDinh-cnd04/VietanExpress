using VietAnExpress.Shipments.Application.Orders;
using VietAnExpress.Shipments.Infrastructure.Legacy;
using Xunit;

namespace VietAnExpress.Shipments.Tests.Application;

public class LegacyOrderFactoryTests
{
    private static readonly LegacyCustomerRef Customer = new(201008, "SGB EXPRESS HN", "Đức Anh", "0977714964", null);
    private static readonly DateTime Today = new(2026, 9, 29);

    private static OrderPayload Payload(string type = "PACK", params OrderPayload.PackagePart[] packages) => new()
    {
        Shipper = new() { Company = "SGB EXPRESS HN", Contact = "Ms Hong Nga", Tel = "0395553421", Address = "241 Tân Xuân, Bắc Từ Liêm, HN", Country = "Vietnam" },
        Service = new() { Carrier = "DHL", Hub = "DHL - Singapore", Reference = "PO-1001" },
        Shipment = new() { Type = type, Pieces = "2", GrossWeight = "1.5" },
        Receiver = new() { Company = "Jason Teo", Contact = "Jason Teo", Tel = "65 98531664", Country = "Singapore", City = "SINGAPORE", Postal = "329640", Addr1 = "8 Bhamo Road", Addr2 = "#02-02 Nova 88" },
        Goods = new() { Description = "WATCH STRAP", DocContent = "Hồ sơ" },
        Packages = [.. packages],
        Invoice = new() { ExportType = "GIFT", Currency = "SGD", Items = [new() { DescEn = "Watch strap", Qty = "2", Price = "5" }] }
    };

    [Fact]
    public void Ghi_dung_dinh_dang_cot_he_thong_cu()
    {
        var o = LegacyOrderFactory.FromPayload(Payload("PACK", new OrderPayload.PackagePart { Qty = "2", Weight = "3", Length = "50", Width = "40", Height = "30" }),
            Customer, 90000001, Today);

        Assert.Equal(201008, o.CustomerId);
        Assert.Equal(90000001, o.OrderNumber);
        Assert.Equal("DHL|Singapore", o.ServiceName);
        Assert.Equal("Jason Teo", o.ConsigneeName);
        Assert.Equal("", o.ConsigneeEmail); // cột NOT NULL
        Assert.Equal(24m, o.WeightKg);      // max(2×3 = 6, 2×50×40×30/5000 = 24)
        Assert.Equal(10m, o.GoodsValue);    // 2 × 5
        Assert.Equal("SGD", o.Currency);
        Assert.Equal("PO-1001", o.CustomerBill);
        Assert.Equal("WATCH STRAP", o.GoodsName);
        Assert.Equal(1, o.Service);
        Assert.Equal(1, o.Status);
        Assert.Equal(Today, o.CreateDate);
        Assert.Null(o.SentDate);
    }

    [Fact]
    public void Chung_tu_lay_can_tong_va_noi_dung_chung_tu()
    {
        var o = LegacyOrderFactory.FromPayload(Payload("DOC"), Customer, 90000002, Today);

        Assert.Equal(1.5m, o.WeightKg);
        Assert.Equal("Hồ sơ", o.GoodsName);
    }

    [Fact]
    public void Cat_chuoi_theo_do_dai_cot()
    {
        var p = Payload();
        p = new OrderPayload { Shipper = p.Shipper, Service = p.Service, Shipment = p.Shipment, Goods = p.Goods, Invoice = p.Invoice,
            Receiver = new() { Company = new string('A', 400), City = new string('C', 80) } };

        var o = LegacyOrderFactory.FromPayload(p, Customer, 1, Today);

        Assert.Equal(250, o.ConsigneeName!.Length);
        Assert.Equal(50, o.ConsigneeCity!.Length);
    }

    [Theory]
    [InlineData("DHL - Singapore", "DHL", "DHL|Singapore")]
    [InlineData("Chuyên tuyến - AU_Toll Vip", "Chuyên tuyến", "Chuyên tuyến|AU_Toll Vip")]
    [InlineData("", "UPS", "UPS")]
    public void Dich_vu_dang_hang_gach_dung_hub(string hub, string carrier, string expected) =>
        Assert.Equal(expected, LegacyOrderFactory.ServiceName(hub, carrier));

}

public class LegacyOrderViewTests
{
    private static readonly DateTime Today = new(2026, 9, 29);

    private static LegacyOrder Order(string? pod = null, DateTime? sent = null, DateTime? eta = null) => new()
    {
        Id = 850139, OrderNumber = 6008435, BillConnect = "6008435", CustomerBill = "SHOP-9",
        ConsigneeName = "Jason Teo", ConsigneeCountry = "Singapore", ServiceName = "Chuyên tuyến|Singapore",
        CreateDate = new DateTime(2025, 12, 30), SentDate = sent, PodEstimate = eta, Pod = pod,
        GoodsName = "WATCH STRAP", Pieces = 1, WeightKg = 0.10m
    };

    [Theory]
    [InlineData("08/01/2026 17:53, DELIVERED Jason Teo", null, null, "ok")]
    [InlineData("08/01/2026 17:53 Consignee not available", null, null, "nd")]
    [InlineData(null, "2026-09-20", "2026-09-25", "late")]
    [InlineData(null, "2026-09-20", "2026-10-05", "fly")]
    [InlineData(null, null, null, "wait")]
    public void Trang_thai_suy_ra_tu_POD_ngay_gui_va_du_kien(string? pod, string? sent, string? eta, string expected) =>
        Assert.Equal(expected, LegacyOrderStatus.Of(Order(pod, Parse(sent), Parse(eta)), Today));

    [Fact]
    public void Doi_sang_dang_Order_cua_frontend()
    {
        var dto = LegacyOrderView.ToDto(Order("08/01/2026 17:53, DELIVERED Jason Teo", new DateTime(2026, 1, 3)), Today);

        Assert.Equal("6008435", dto.Bill);
        Assert.Null(dto.Connect); // trùng số VA thì không lặp lại
        Assert.Equal("Chuyên tuyến - Singapore", dto.Route);
        Assert.Equal("30/12/2025", dto.Created);
        Assert.Equal("03/01/2026", dto.Sent);
        Assert.Equal("ok", dto.St);
        Assert.Equal("1 kiện · 0.1 kg", dto.Pcs);
        Assert.Equal("PACK", dto.Type);
        Assert.Equal(new("08/01/2026", "17:53", "Jason Teo"), dto.Pod);
    }

    [Theory]
    [InlineData("16/01/2026 12:26 DELIVERED Signed for by: W.WILLIAN", "W.WILLIAN")]
    [InlineData("09/01/2026 08:46 Delivered", "")]
    public void Tach_ten_nguoi_ky(string pod, string signer) =>
        Assert.Equal(signer, LegacyOrderView.ParsePod(pod)!.Signer);

    [Theory]
    [InlineData("DOCUMENTS", true)]
    [InlineData("Hồ sơ chứng từ", true)]
    [InlineData("Dockside tool", false)]
    public void Nhan_dien_chung_tu(string goods, bool isDoc) => Assert.Equal(isDoc, LegacyOrderView.IsDocument(goods));

    private static DateTime? Parse(string? d) => d is null ? null : DateTime.Parse(d, System.Globalization.CultureInfo.InvariantCulture);
}

public class LegacyOrderDetailTests
{
    [Fact]
    public void Chi_tiet_don_co_du_nguoi_gui_nguoi_nhan_de_nhan_ban()
    {
        var o = new LegacyOrder
        {
            Id = 1, OrderNumber = 90000001, SenderName = "SCS CO., LTD", SenderPhone = "0909", SenderAddress = "14 Sam Sơn",
            ConsigneeName = "ACME LTD", ConsigneeCountry = "United Kingdom", ConsigneeCity = "LONDON", ConsigneeAddress1 = "1 King St",
            ConsigneeAddress2 = "Floor 2", ConsigneePostalCode = "EC1A 1BB", ConsigneePhone = "+44"
        };

        var dto = LegacyOrderView.ToDetailDto(o, new DateTime(2026, 9, 29));

        Assert.Equal("SCS CO., LTD", dto.Shipper!.Company);
        Assert.Equal("1 King St", dto.Receiver!.Addr1);
        Assert.Equal("EC1A 1BB", dto.Receiver.Postal);
        Assert.Null(LegacyOrderView.ToDto(o, new DateTime(2026, 9, 29)).Receiver); // danh sách không kèm để nhẹ
    }
}
