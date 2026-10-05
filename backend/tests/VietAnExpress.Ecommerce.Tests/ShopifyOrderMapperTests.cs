using System.Text.Json;
using VietAnExpress.Ecommerce.Infrastructure.Shopify;
using Xunit;

namespace VietAnExpress.Ecommerce.Tests;

public class ShopifyOrderMapperTests
{
    private static JsonElement Parse(string json) => JsonDocument.Parse(json).RootElement;

    [Fact]
    public void Map_doc_du_thong_tin_don()
    {
        var o = ShopifyOrderMapper.Map(Parse("""
            {
              "id": "gid://shopify/Order/5551234", "name": "#1001", "createdAt": "2026-10-05T03:15:00Z",
              "email": "jane@example.com", "phone": null, "note": "Giao giờ hành chính", "currencyCode": "USD", "totalWeight": "1250",
              "totalPriceSet": { "shopMoney": { "amount": "59.90" } },
              "shippingAddress": { "name": "Jane Doe", "company": null, "address1": "1 Main St", "address2": "", "city": "Sydney",
                                   "province": "New South Wales", "zip": "2000", "country": "Australia", "countryCodeV2": "AU", "phone": "+61 400 000 000" },
              "lineItems": { "nodes": [
                { "title": "Áo dài", "sku": "AD-01", "quantity": 2, "originalUnitPriceSet": { "shopMoney": { "amount": "25.00" } } },
                { "title": "Nón lá", "sku": "", "quantity": 1, "originalUnitPriceSet": { "shopMoney": { "amount": "9.90" } } }
              ] }
            }
            """));

        Assert.Equal("5551234", o.PlatformOrderId);
        Assert.Equal("#1001", o.OrderName);
        Assert.Equal("Jane Doe", o.Recipient.Name);
        Assert.Equal("+61400000000", o.Recipient.Phone);
        Assert.Null(o.Recipient.Address2);
        Assert.Equal("AU", o.Recipient.CountryCode);
        Assert.Equal(3, o.ItemCount);
        Assert.Equal(1.25m, o.WeightKg);
        Assert.Equal(59.90m, o.TotalAmount);
        Assert.Equal(new DateTime(2026, 10, 5, 10, 15, 0), o.PlacedAt); // giờ Việt Nam
        Assert.Contains("\"sku\":\"AD-01\"", o.ProductsJson);
    }

    [Fact]
    public void Map_chiu_duoc_du_lieu_bi_an()
    {
        // Chưa được cấp quyền dữ liệu khách hàng: Shopify trả null cho địa chỉ / email.
        var o = ShopifyOrderMapper.Map(Parse("""{ "id": "gid://shopify/Order/9", "name": "#1002", "shippingAddress": null, "email": null, "totalWeight": 0, "lineItems": { "nodes": [] } }"""));
        Assert.Equal("9", o.PlatformOrderId);
        Assert.Null(o.Recipient.Name);
        Assert.Null(o.WeightKg);
        Assert.Equal(0, o.ItemCount);
        Assert.Null(o.ProductsJson);
    }
}
