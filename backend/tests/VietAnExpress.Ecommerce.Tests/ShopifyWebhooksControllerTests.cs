using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using VietAnExpress.Ecommerce.Api;
using VietAnExpress.Ecommerce.Infrastructure;
using VietAnExpress.Ecommerce.Infrastructure.Shopify;
using Xunit;

namespace VietAnExpress.Ecommerce.Tests;

/// <summary>Đúng hành vi Shopify kiểm khi duyệt app: chữ ký sai / thiếu → 401 và không xử lý; đúng → 200.</summary>
public class ShopifyWebhooksControllerTests
{
    private const string Secret = "shpss_test_secret";
    private const string Body = """{"shop_id":1,"shop_domain":"abc.myshopify.com","orders_to_redact":[1]}""";

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static string Sign(string body) =>
        Convert.ToBase64String(HMACSHA256.HashData(Encoding.UTF8.GetBytes(Secret), Encoding.UTF8.GetBytes(body)));

    private static (ShopifyWebhooksController Controller, ShopifyWebhookQueue Queue) Create(string body, string? hmac, string topic = "customers/redact")
    {
        var queue = new ShopifyWebhookQueue();
        var http = new DefaultHttpContext();
        http.Request.Method = "POST";
        http.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        http.Request.Headers["X-Shopify-Topic"] = topic;
        http.Request.Headers["X-Shopify-Shop-Domain"] = "abc.myshopify.com";
        http.Request.Headers["X-Shopify-Webhook-Id"] = Guid.NewGuid().ToString();
        if (hmac is not null) http.Request.Headers["X-Shopify-Hmac-Sha256"] = hmac;

        var controller = new ShopifyWebhooksController(
            Options.Create(new ShopifyOptions { ClientId = "id", ClientSecret = Secret }), queue, NullLogger<ShopifyWebhooksController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = http }
        };
        return (controller, queue);
    }

    [Fact]
    public async Task Chu_ky_dung_tra_200_ngay_va_xep_hang_xu_ly_nen()
    {
        var (controller, queue) = Create(Body, Sign(Body));

        var result = await controller.Receive(Ct);

        Assert.IsType<OkResult>(result);
        Assert.True(queue.Reader.TryRead(out var c));
        Assert.Equal(("customers/redact", "abc.myshopify.com", Body), (c.Topic, c.Shop, Encoding.UTF8.GetString(c.Body)));
        Assert.False(queue.Reader.TryRead(out _));
    }

    [Theory]
    [InlineData(null)]                      // thiếu header
    [InlineData("")]
    [InlineData("aW52YWxpZA==")]            // base64 hợp lệ nhưng sai chữ ký
    public async Task Chu_ky_sai_hoac_thieu_tra_401_va_khong_xu_ly(string? hmac)
    {
        var (controller, queue) = Create(Body, hmac);

        var result = await controller.Receive(Ct);

        Assert.Equal(StatusCodes.Status401Unauthorized, Assert.IsType<UnauthorizedResult>(result).StatusCode);
        Assert.False(queue.Reader.TryRead(out _));
    }

    [Fact]
    public async Task Body_bi_sua_sau_khi_ky_tra_401()
    {
        var (controller, queue) = Create(Body.Replace("[1]", "[2]"), Sign(Body));

        Assert.IsType<UnauthorizedResult>(await controller.Receive(Ct));
        Assert.False(queue.Reader.TryRead(out _));
    }

    [Theory]
    [InlineData("customers/data_request")]
    [InlineData("shop/redact")]
    [InlineData("app/uninstalled")]
    [InlineData("orders/create")]
    public async Task Moi_chu_de_deu_kiem_chu_ky_truoc(string topic)
    {
        var (bad, _) = Create(Body, "aW52YWxpZA==", topic);
        Assert.IsType<UnauthorizedResult>(await bad.Receive(Ct));

        var (good, _) = Create(Body, Sign(Body), topic);
        Assert.IsType<OkResult>(await good.Receive(Ct));
    }
}
