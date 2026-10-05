using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using VietAnExpress.Ecommerce.Application;
using VietAnExpress.Ecommerce.Contracts;
using VietAnExpress.Ecommerce.Infrastructure;
using VietAnExpress.SharedKernel.Authorization;
using VietAnExpress.SharedKernel.Web;

namespace VietAnExpress.Ecommerce.Api;

/// <summary>Kết nối shop trên kênh bán qua OAuth — API_CONTRACT.md §5.1, chi tiết luồng: docs/ECOM_INTEGRATION.md.</summary>
[ApiVersion(1)]
[Route("api/v{version:apiVersion}/ecom")]
[Tags("E-commerce")]
internal sealed class StoresController(PortalHosts portalHosts, IConfiguration configuration) : ApiControllerBase
{
    /// <summary>Shop khách đã kết nối (không gồm shop đã ngắt).</summary>
    [HttpGet("stores")]
    [HasPermission(EcommercePermissions.View)]
    [ProducesResponseType<ApiResponse<IReadOnlyList<StoreConnectionDto>>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct) => OkData(await Sender.Send(new GetStoreConnectionsQuery(), ct));

    /// <summary>Bắt đầu ủy quyền: trả <c>authorizeUrl</c> để trình duyệt chuyển sang sàn, kèm cookie nonce 10 phút.</summary>
    [HttpPost("stores/connect")]
    [HasPermission(EcommercePermissions.Connect)]
    [ProducesResponseType<StartConnectionResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Connect(StartConnectionRequest body, CancellationToken ct)
    {
        var result = await Sender.Send(new StartStoreConnectionCommand(body.Platform, body.ShopDomain, RequestPortalHost()), ct);
        if (result.IsFailure) return Problem(result.Error);

        Response.Cookies.Append(OAuthState.CookieName, result.Value.Nonce, NonceCookie(DateTimeOffset.UtcNow + OAuthState.Lifetime));
        return Ok(new StartConnectionResponse(result.Value.AuthorizeUrl));
    }

    /// <summary>Shopify redirect về sau khi chủ shop đồng ý → 302 về /ecommerce?tab=connect&amp;connected=shopify hoặc &amp;error=…</summary>
    [HttpGet("oauth/shopify/callback")]
    [AllowAnonymous]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> ShopifyCallback(CancellationToken ct)
    {
        var query = Request.Query.Select(q => new KeyValuePair<string, string>(q.Key, q.Value.ToString())).ToList();
        var outcome = await Sender.Send(new CompleteShopifyConnectionCommand(query, Request.Cookies[OAuthState.CookieName]), ct);
        Response.Cookies.Delete(OAuthState.CookieName, NonceCookie(null));

        var host = outcome.PortalHost is { } h && portalHosts.IsAllowed(h) ? h : RequestPortalHost();
        var target = outcome.Error is null
            ? $"/ecommerce?tab=connect&connected={SalesChannelCodes.Shopify}"
            : $"/ecommerce?tab=connect&error={Uri.EscapeDataString(outcome.Error)}";
        return Redirect(PortalHosts.Url(host, target));
    }

    /// <summary>Kéo ngay đơn đang mở, chưa giao từ sàn về dbo.DonTMDT (đơn đã có thì cập nhật nếu chưa cấp bill).</summary>
    [HttpPost("stores/{id:long}/sync")]
    [HasPermission(EcommercePermissions.Connect)]
    [ProducesResponseType<SyncResult>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Sync(long id, CancellationToken ct)
    {
        var result = await Sender.Send(new SyncStoreCommand(id), ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    /// <summary>Đơn E-commerce của khách, lọc theo nguồn (src) và từ khóa (q) — mới nhất trước, tối đa 500.</summary>
    [HttpGet("orders")]
    [HasPermission(EcommercePermissions.View)]
    [ProducesResponseType<ApiResponse<IReadOnlyList<EcomOrderDto>>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Orders([FromQuery] string? src, [FromQuery] string? q, CancellationToken ct) =>
        OkData(await Sender.Send(new GetEcomOrdersQuery(src, q), ct));

    /// <summary>Ngắt kết nối: gỡ app khỏi shop (nếu được) và xóa token.</summary>
    [HttpDelete("stores/{id:long}")]
    [HasPermission(EcommercePermissions.Connect)]
    [ProducesResponseType<ApiMessage>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Disconnect(long id, CancellationToken ct) =>
        FromResult(await Sender.Send(new DisconnectStoreCommand(id), ct), "Đã ngắt kết nối cửa hàng");

    /// <summary>Domain portal của request (proxy Vercel gửi qua X-Forwarded-Host), chỉ nhận domain trong danh sách cho phép.</summary>
    private string RequestPortalHost() => portalHosts.Resolve(Request.Headers["X-Forwarded-Host"].FirstOrDefault(), Request.Host.Value);

    // Lax (không phải Strict): phải đi kèm lần chuyển trang từ Shopify về callback.
    private CookieOptions NonceCookie(DateTimeOffset? expires) => new()
    {
        HttpOnly = true,
        Secure = configuration.GetValue("Jwt:SecureCookies", true),
        SameSite = SameSiteMode.Lax,
        Path = "/api/v1/ecom/oauth",
        Expires = expires,
        IsEssential = true
    };
}

internal sealed record StartConnectionRequest(string? Platform, string? ShopDomain, string? Region);

/// <summary>Frontend đọc thẳng <c>authorizeUrl</c> (không bọc trong data).</summary>
internal sealed record StartConnectionResponse(string AuthorizeUrl);
