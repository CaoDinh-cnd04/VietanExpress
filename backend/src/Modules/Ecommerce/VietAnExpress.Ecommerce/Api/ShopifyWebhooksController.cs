using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VietAnExpress.Ecommerce.Application;
using VietAnExpress.Ecommerce.Infrastructure.Shopify;
using VietAnExpress.SharedKernel.Web;

namespace VietAnExpress.Ecommerce.Api;

/// <summary>
/// Nhận mọi webhook Shopify (1 URL cho tất cả chủ đề, gồm 3 webhook compliance bắt buộc với app public).
/// Kiểm X-Shopify-Hmac-Sha256 trên body thô: sai / thiếu chữ ký → 401 (Shopify kiểm điều này khi duyệt app); đúng → 200 ngay.
/// </summary>
[ApiVersion(1)]
[Route("api/v{version:apiVersion}/ecom/webhooks/shopify")]
[AllowAnonymous]
[ApiExplorerSettings(IgnoreApi = true)]
internal sealed class ShopifyWebhooksController(IOptions<ShopifyOptions> options, ILogger<ShopifyWebhooksController> logger) : ApiControllerBase
{
    /// <summary>Payload webhook Shopify nhỏ (vài chục KB); chặn body lớn bất thường.</summary>
    private const int MaxBodyBytes = 1024 * 1024;

    [HttpPost]
    [RequestSizeLimit(MaxBodyBytes)]
    public async Task<IActionResult> Receive(CancellationToken ct)
    {
        using var buffer = new MemoryStream();
        await Request.Body.CopyToAsync(buffer, ct);
        var body = buffer.ToArray();

        var topic = Request.Headers["X-Shopify-Topic"].ToString();
        var shopHeader = Request.Headers["X-Shopify-Shop-Domain"].ToString();
        if (!ShopifyWebhook.IsValidHmac(body, Request.Headers["X-Shopify-Hmac-Sha256"].ToString(), options.Value.ClientSecret))
        {
            logger.LogWarning("Webhook Shopify sai chữ ký: topic {Topic}, shop {Shop}", topic, shopHeader);
            return Unauthorized();
        }

        // Chữ ký đúng nhưng thiếu header (không xảy ra với Shopify thật) → vẫn 200 để Shopify không gửi lại mãi.
        if (ShopifyOAuth.NormalizeShop(shopHeader) is not { } shop || topic.Length == 0) return Ok();

        var outcome = await Sender.Send(new ReceiveShopifyWebhookCommand(topic, shop, Request.Headers["X-Shopify-Webhook-Id"].ToString(), body), ct);
        logger.LogInformation("Webhook Shopify {Topic} từ {Shop}: {Action} ({Affected})", topic, shop, outcome.Action, outcome.Affected);
        return Ok();
    }
}
