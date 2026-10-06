using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using VietAnExpress.Ecommerce.Api;
using VietAnExpress.Ecommerce.Application;
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

    private static (ShopifyWebhooksController Controller, Mock<ISender> Sender) Create(string body, string? hmac, string topic = "customers/redact")
    {
        var sender = new Mock<ISender>();
        sender.Setup(s => s.Send(It.IsAny<ReceiveShopifyWebhookCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WebhookOutcome("redact-customer", 1));

        var http = new DefaultHttpContext
        {
            RequestServices = new ServiceCollection().AddSingleton(sender.Object).BuildServiceProvider()
        };
        http.Request.Method = "POST";
        http.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        http.Request.Headers["X-Shopify-Topic"] = topic;
        http.Request.Headers["X-Shopify-Shop-Domain"] = "abc.myshopify.com";
        http.Request.Headers["X-Shopify-Webhook-Id"] = Guid.NewGuid().ToString();
        if (hmac is not null) http.Request.Headers["X-Shopify-Hmac-Sha256"] = hmac;

        var controller = new ShopifyWebhooksController(
            Options.Create(new ShopifyOptions { ClientId = "id", ClientSecret = Secret }), NullLogger<ShopifyWebhooksController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = http }
        };
        return (controller, sender);
    }

    [Fact]
    public async Task Chu_ky_dung_tra_200_va_xu_ly_webhook()
    {
        var (controller, sender) = Create(Body, Sign(Body));

        var result = await controller.Receive(Ct);

        Assert.IsType<OkResult>(result);
        sender.Verify(s => s.Send(It.Is<ReceiveShopifyWebhookCommand>(c =>
            c.Topic == "customers/redact" && c.Shop == "abc.myshopify.com" && Encoding.UTF8.GetString(c.Body) == Body), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(null)]                      // thiếu header
    [InlineData("")]
    [InlineData("aW52YWxpZA==")]            // base64 hợp lệ nhưng sai chữ ký
    public async Task Chu_ky_sai_hoac_thieu_tra_401_va_khong_xu_ly(string? hmac)
    {
        var (controller, sender) = Create(Body, hmac);

        var result = await controller.Receive(Ct);

        Assert.Equal(StatusCodes.Status401Unauthorized, Assert.IsType<UnauthorizedResult>(result).StatusCode);
        sender.Verify(s => s.Send(It.IsAny<ReceiveShopifyWebhookCommand>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Body_bi_sua_sau_khi_ky_tra_401()
    {
        var (controller, sender) = Create(Body.Replace("[1]", "[2]"), Sign(Body));

        Assert.IsType<UnauthorizedResult>(await controller.Receive(Ct));
        sender.Verify(s => s.Send(It.IsAny<ReceiveShopifyWebhookCommand>(), It.IsAny<CancellationToken>()), Times.Never);
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
