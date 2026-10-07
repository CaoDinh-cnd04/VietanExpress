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

    /// <summary>
    /// application_url của app Shopify: Shopify mở kèm ?shop=…&amp;hmac=… khi cài / mở app. Kiểm chữ ký rồi 302 sang OAuth ngay
    /// (shop đã kết nối thì 302 vào portal); sai chữ ký → 302 về tab Kết nối kèm lỗi.
    /// </summary>
    [HttpGet("shopify/launch")]
    [AllowAnonymous]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> ShopifyLaunch(CancellationToken ct)
    {
        var host = RequestPortalHost();
        var result = await Sender.Send(new StartShopifyInstallCommand(QueryPairs(), host), ct);
        if (result.IsFailure) return Redirect(PortalHosts.Url(host, $"/ecommerce?tab=connect&error={Uri.EscapeDataString(result.Error.Message)}"));

        if (result.Value.Nonce is { } nonce) Response.Cookies.Append(OAuthState.CookieName, nonce, NonceCookie(DateTimeOffset.UtcNow + OAuthState.Lifetime));
        return Redirect(result.Value.RedirectUrl);
    }

    /// <summary>Khách đã đăng nhập: gắn shop vừa cài từ Shopify (cookie do callback đặt) vào tài khoản.</summary>
    [HttpPost("stores/claim")]
    [HasPermission(EcommercePermissions.Connect)]
    [ProducesResponseType<ApiResponse<StoreConnectionDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Claim(CancellationToken ct)
    {
        var result = await Sender.Send(new ClaimShopifyInstallCommand(Request.Cookies[OAuthState.InstallCookieName]), ct);
        Response.Cookies.Delete(OAuthState.InstallCookieName, InstallCookie(null));
        return result.IsFailure ? Problem(result.Error) : OkData(result.Value);
    }

    /// <summary>Shopify redirect về sau khi chủ shop đồng ý → 302 về /ecommerce?tab=connect&amp;connected=shopify hoặc &amp;error=…</summary>
    [HttpGet("oauth/shopify/callback")]
    [AllowAnonymous]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> ShopifyCallback(CancellationToken ct)
    {
        var outcome = await Sender.Send(new CompleteShopifyConnectionCommand(QueryPairs(), Request.Cookies[OAuthState.CookieName]), ct);
        Response.Cookies.Delete(OAuthState.CookieName, NonceCookie(null));

        var host = outcome.PortalHost is { } h && portalHosts.IsAllowed(h) ? h : RequestPortalHost();
        // Cài từ Shopify: giữ token trong cookie, portal bắt đăng nhập rồi gọi stores/claim.
        if (outcome.PendingInstall is { } pending)
        {
            Response.Cookies.Append(OAuthState.InstallCookieName, pending, InstallCookie(DateTimeOffset.UtcNow + OAuthState.InstallLifetime));
            return Redirect(PortalHosts.Url(host, "/ecommerce/shopify"));
        }
        var target = outcome.Error is null
            ? $"/ecommerce?tab=connect&connected={SalesChannelCodes.Shopify}"
            : $"/ecommerce?tab=connect&error={Uri.EscapeDataString(outcome.Error)}";
        return Redirect(PortalHosts.Url(host, target));
    }

    /// <summary>Kéo ngay đơn đang mở, chưa giao từ sàn về dbo.DonTMDT (đơn đã có thì cập nhật nếu chưa cấp bill).</summary>
    [HttpPost("stores/{id:long}/sync")]
    [HasPermission(EcommercePermissions.Orders)]
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
    public async Task<IActionResult> Orders([FromQuery] string? src, [FromQuery] string? q, [FromQuery] string? scope, CancellationToken ct) =>
        OkData(await Sender.Send(new GetEcomOrdersQuery(src, q, scope), ct));

    /// <summary>Khách nhập tay 1 đơn (1–5 sản phẩm) vào danh sách đơn E-commerce.</summary>
    [HttpPost("manual")]
    [HasPermission(EcommercePermissions.Orders)]
    [ProducesResponseType<ApiResponse<EcomOrderDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateManual(ManualOrderInput body, CancellationToken ct)
    {
        var result = await Sender.Send(new CreateManualOrderCommand(body), ct);
        return FromResult(result, result.IsSuccess ? $"Đã lưu đơn {result.Value.Ref}" : null);
    }

    /// <summary>Nhập đơn từ file CSV (hiện nhận file "Export orders" của Shopify) → { message, importedCount, errors: [{ row, message }] }.</summary>
    [HttpPost("import-csv")]
    [HasPermission(EcommercePermissions.Orders)]
    [RequestSizeLimit(6 * 1024 * 1024)]
    [ProducesResponseType<CsvImportResult>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ImportCsv(ImportCsvRequest body, CancellationToken ct)
    {
        var result = await Sender.Send(new ImportOrdersCsvCommand(body.Csv), ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    /// <summary>Sửa đơn chưa có bill: người nhận, cân nặng, sản phẩm / mã HS, dịch vụ. Đồng bộ lại từ sàn không ghi đè dữ liệu đã sửa.</summary>
    [HttpPut("orders/{id:long}")]
    [HasPermission(EcommercePermissions.Orders)]
    [ProducesResponseType<ApiResponse<EcomOrderDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateOrder(long id, EcomOrderEditInput body, CancellationToken ct) =>
        FromResult(await Sender.Send(new UpdateEcomOrderCommand(id, body), ct), "Đã lưu thay đổi");

    /// <summary>Xác nhận gửi → đơn chuyển sang "Đơn hàng của tôi" (đơn thiếu tên / địa chỉ / SĐT / sản phẩm bị bỏ qua).</summary>
    [HttpPost("orders/confirm")]
    [HasPermission(EcommercePermissions.Orders)]
    [ProducesResponseType<ConfirmOrdersResult>(StatusCodes.Status200OK)]
    public Task<IActionResult> Confirm(OrderIdsRequest body, CancellationToken ct) => SendConfirm(body, true, ct);

    /// <summary>Trả đơn đã xác nhận (chưa có bill) về tab Đơn hàng.</summary>
    [HttpPost("orders/unconfirm")]
    [HasPermission(EcommercePermissions.Orders)]
    [ProducesResponseType<ConfirmOrdersResult>(StatusCodes.Status200OK)]
    public Task<IActionResult> Unconfirm(OrderIdsRequest body, CancellationToken ct) => SendConfirm(body, false, ct);

    private async Task<IActionResult> SendConfirm(OrderIdsRequest body, bool confirm, CancellationToken ct)
    {
        var result = await Sender.Send(new ConfirmEcomOrdersCommand(body.Ids, confirm), ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    /// <summary>Xóa (ẩn) đơn chưa có bill — 1 hoặc nhiều đơn. Đơn Shopify đã xóa không bị đồng bộ / nhập file tạo lại.</summary>
    [HttpPost("orders/delete")]
    [HasPermission(EcommercePermissions.Orders)]
    [ProducesResponseType<DeleteOrdersResult>(StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteOrders(OrderIdsRequest body, CancellationToken ct)
    {
        var result = await Sender.Send(new DeleteEcomOrdersCommand(body.Ids), ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }

    /// <summary>Ngắt kết nối: gỡ app khỏi shop (nếu được) và xóa token.</summary>
    [HttpDelete("stores/{id:long}")]
    [HasPermission(EcommercePermissions.Connect)]
    [ProducesResponseType<ApiMessage>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Disconnect(long id, CancellationToken ct) =>
        FromResult(await Sender.Send(new DisconnectStoreCommand(id), ct), "Đã ngắt kết nối cửa hàng");

    private List<KeyValuePair<string, string>> QueryPairs() =>
        [.. Request.Query.Select(q => new KeyValuePair<string, string>(q.Key, q.Value.ToString()))];

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

    // Lax: đặt ở callback (điều hướng từ Shopify về), portal gọi stores/claim cùng domain.
    private CookieOptions InstallCookie(DateTimeOffset? expires) => new()
    {
        HttpOnly = true,
        Secure = configuration.GetValue("Jwt:SecureCookies", true),
        SameSite = SameSiteMode.Lax,
        Path = "/api/v1/ecom",
        Expires = expires,
        IsEssential = true
    };
}

internal sealed record ImportCsvRequest(string? Csv);

internal sealed record OrderIdsRequest(IReadOnlyList<string>? Ids);

internal sealed record StartConnectionRequest(string? Platform, string? ShopDomain, string? Region);

/// <summary>Frontend đọc thẳng <c>authorizeUrl</c> (không bọc trong data).</summary>
internal sealed record StartConnectionResponse(string AuthorizeUrl);
