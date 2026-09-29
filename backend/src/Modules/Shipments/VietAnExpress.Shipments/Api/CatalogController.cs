using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using VietAnExpress.SharedKernel.Authorization;
using VietAnExpress.SharedKernel.Web;
using VietAnExpress.Shipments.Application.Orders;
using VietAnExpress.Shipments.Contracts;

namespace VietAnExpress.Shipments.Api;

/// <summary>
/// Khai invoice nhanh ở bước tạo đơn — dữ liệu lấy từ các dòng hàng khách đã khai (dbo.MaVanDon_ChiTietHang),
/// chỉ đơn của chính khách. Hợp đồng frontend: web/docs/API_CONTRACT.md §3.
/// </summary>
[ApiVersion(1)]
[Route("api/v{version:apiVersion}")]
[Tags("Tạo đơn")]
internal sealed class CatalogController : ApiControllerBase
{
    /// <summary>Thư viện mặt hàng: mỗi mặt hàng đã khai 1 dòng, đơn giá lần gần nhất.</summary>
    [HttpGet("catalog/products")]
    [HasPermission(ShipmentsPermissions.View)]
    [ProducesResponseType<ApiResponse<IReadOnlyList<SavedProductDto>>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Products(CancellationToken ct) => OkData(await Sender.Send(new GetProductLibraryQuery(), ct));

    /// <summary>Invoice của các đơn gần đây (≤ 50) để chép lại.</summary>
    [HttpGet("invoices/recent")]
    [HasPermission(ShipmentsPermissions.View)]
    [ProducesResponseType<ApiResponse<IReadOnlyList<RecentInvoiceDto>>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> RecentInvoices([FromQuery] int? limit, CancellationToken ct) =>
        OkData(await Sender.Send(new GetRecentInvoicesQuery(limit), ct));
}
