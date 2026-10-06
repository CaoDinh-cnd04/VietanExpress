using VietAnExpress.Ecommerce.Application;
using VietAnExpress.Ecommerce.Domain;
using VietAnExpress.Ecommerce.Infrastructure.Shopify;
using Xunit;

namespace VietAnExpress.Ecommerce.Tests;

public class OrderDataTests
{
    [Theory]
    [InlineData("08061171122", "JP", "+818061171122")]
    [InlineData("+81 70-2622-0328", "JP", "+817026220328")]
    [InlineData("(917) 558-1371", "US", "+19175581371")]
    [InlineData("'0912 345 678", "VN", "+84912345678")]
    [InlineData("0044 20 7946 0000", "GB", "+442079460000")]
    [InlineData("12345678", "ZZ", "12345678")]
    [InlineData("  ", "JP", null)]
    public void NormalizePhone(string input, string country, string? expected) => Assert.Equal(expected, OrderData.NormalizePhone(input, country));

    [Theory]
    [InlineData("'07028", "07028")]
    [InlineData(" sw1a  1aa ", "SW1A 1AA")]
    [InlineData("'", null)]
    public void NormalizePostal(string input, string? expected) => Assert.Equal(expected, OrderData.NormalizePostal(input));

    [Fact]
    public void CountryName_tra_ten_tieng_Anh() => Assert.Equal("Japan", OrderData.CountryName("JP"));

    [Theory]
    [InlineData("13 Winsor Place", true)]
    [InlineData("ØSAMA Café, Straße 5", true)]
    [InlineData("中央三丁目3-1", false)]
    [InlineData("서울시", false)]
    public void IsLatin(string text, bool expected) => Assert.Equal(expected, OrderData.IsLatin(text));
}

public class ShopifyExportParserTests
{
    // Cùng cấu trúc file "Export orders" của Shopify (rút gọn cột), dữ liệu giả.
    private const string Export =
        "﻿Name,Email,Financial Status,Fulfillment Status,Currency,Total,Created at,Lineitem quantity,Lineitem name,Lineitem price,Lineitem sku," +
        "Shipping Name,Shipping Address1,Shipping Address2,Shipping Company,Shipping City,Shipping Zip,Shipping Province,Shipping Country,Shipping Phone," +
        "Notes,Cancelled at,Id,Shipping Province Name\r\n" +
        "#t1001,a@example.com,paid,unfulfilled,USD,115.00,2025-04-11 07:02:03 +0700,1,TRACKSUIT - GREY / L,90.00,,Jane Roe,1 Main St,,,Glen Ridge,'07028,NJ,US,+19175550100,,,1001,New Jersey\r\n" +
        "#t1002,b@example.com,paid,unfulfilled,USD,188.37,2025-04-11 08:21:08 +0700,1,\"\"\"005 CHAOS\"\" T SHIRT - S\",61.40,TS-1,山田 太郎,中央三丁目3-1,,,京田辺市,610-0313,JP-26,JP,08000000000,in,,1002,Kyoto\r\n" +
        "#t1002,b@example.com,,,,,2025-04-11 08:21:08 +0700,2,\"SKIRT PANTS, black\",101.16,,,,,,,,,,,,,,\r\n" +
        "#t1003,c@example.com,paid,fulfilled,USD,20.00,2025-04-12 10:00:00 +0700,1,Hat,20.00,,Al Bo,2 High St,,,London,SW1A 1AA,,GB,,,,1003,\r\n";

    private static ExportParseResult Parse() => ShopifyExportParser.Parse(Csv.Parse(Export));

    [Fact]
    public void Nhan_dung_file_export_cua_Shopify()
    {
        Assert.True(ShopifyExportParser.IsShopifyExport(Csv.Parse(Export)[0]));
        Assert.False(ShopifyExportParser.IsShopifyExport(["Ref", "Consignee", "Country"]));
    }

    [Fact]
    public void Gop_dong_theo_don_va_chuan_hoa()
    {
        var r = Parse();
        Assert.Empty(r.Errors);
        Assert.Equal(["#t1001", "#t1002", "#t1003"], r.Orders.Select(o => o.Order.OrderName));

        var us = r.Orders[0].Order;
        Assert.Equal("1001", us.PlatformOrderId);
        Assert.Equal("07028", us.Recipient.PostalCode);
        Assert.Equal("United States", us.Recipient.CountryName);
        Assert.Equal("New Jersey", us.Recipient.Province);
        Assert.Equal(new DateTime(2025, 4, 11, 7, 2, 3), us.PlacedAt);
        Assert.Null(us.WeightKg);

        var jp = r.Orders[1];
        Assert.Equal(3, jp.Row); // dòng 1 là tiêu đề
        Assert.Equal(3, jp.Order.ItemCount);
        Assert.Equal("+818000000000", jp.Order.Recipient.Phone);
        Assert.Equal(188.37m, jp.Order.TotalAmount);
        Assert.Contains("\\u0022005 CHAOS\\u0022 T SHIRT - S", jp.Order.ProductsJson);
        Assert.Contains("SKIRT PANTS, black", jp.Order.ProductsJson);

        Assert.True(r.Orders[2].Fulfilled);
    }
}

public class OrderEditRulesTests
{
    private static EcomOrderEditInput Input(string? hs = "6109.10", decimal? kg = 0.45m) => new(
        new EcomReceiverInput("Taro Yamada", null, "080-0000-0000", null, "Chuo 3-3-1", null, "Kyotanabe", "Kyoto", "'610-0313", "jp"),
        kg, [new ManualProductInput("T-shirt", "TS-1", 2, 10, 20, hs)], "DHL", "SGN", "TP.HCM", null);

    [Fact]
    public void Build_chuan_hoa_du_lieu_sua()
    {
        var r = OrderEditRules.Build(Input());
        Assert.True(r.IsSuccess);
        Assert.Equal("+818000000000", r.Value.Recipient.Phone);
        Assert.Equal("610-0313", r.Value.Recipient.PostalCode);
        Assert.Equal("JP", r.Value.Recipient.CountryCode);
        Assert.Equal("Japan", r.Value.Recipient.CountryName);
        Assert.Equal("610910", r.Value.Products[0].HsCode);
        Assert.Equal(0.45m, r.Value.WeightKg);
    }

    [Fact]
    public void Build_tu_choi_ma_HS_sai_va_thieu_dia_chi()
    {
        Assert.True(OrderEditRules.Build(Input(hs: "61")).IsFailure);
        Assert.True(OrderEditRules.Build(Input(kg: -1)).IsFailure);
        Assert.True(OrderEditRules.Build(Input() with { Receiver = new("A", null, null, null, "", null, null, null, null, "JP") }).IsFailure);
    }

    [Fact]
    public void Issues_liet_ke_viec_can_bo_sung()
    {
        var order = MarketplaceOrder.Import(1, null, "shopify", new ImportedOrder("9", "#9",
            new MarketplaceRecipient("山田", null, null, null, "中央3-1", null, "京田辺市", null, "610-0313", "JP", "Japan"),
            1, null, "USD", 10, "[{\"name\":\"Tee\",\"sku\":\"\",\"qty\":1,\"fobPrice\":1,\"sellingPrice\":1}]", null, null), DateTime.Now);
        // Cân nặng, mã HS, chữ Latin không còn bắt buộc — chỉ thiếu SĐT.
        Assert.Equal(["Thiếu số điện thoại người nhận"], OrderData.Issues(order));
    }
}
