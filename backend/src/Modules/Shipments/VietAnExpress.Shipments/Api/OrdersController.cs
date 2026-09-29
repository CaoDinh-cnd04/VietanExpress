using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using VietAnExpress.SharedKernel.Authorization;
using VietAnExpress.SharedKernel.Web;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Application.Orders;
using VietAnExpress.Shipments.Contracts;

namespace VietAnExpress.Shipments.Api;

/// <summary>
/// "Đơn hàng của tôi" — đọc / ghi bảng vận đơn hệ thống cũ dbo.MaVanDon.
/// Dạng dữ liệu theo hợp đồng frontend: web/docs/API_CONTRACT.md §1.
/// </summary>
[ApiVersion(1)]
[Route("api/v{version:apiVersion}/orders")]
[Tags("Đơn hàng")]
internal sealed class OrdersController : ApiControllerBase
{
    [HttpGet]
    [HasPermission(ShipmentsPermissions.View)]
    [ProducesResponseType<OrderListResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? q, [FromQuery] string? searchField, [FromQuery] string? status,
        [FromQuery] DateOnly? fromDate, [FromQuery] DateOnly? toDate,
        [FromQuery] decimal? weightFrom, [FromQuery] decimal? weightTo,
        [FromQuery] int? page, [FromQuery] int? pageSize, [FromQuery] string? sortBy, [FromQuery] string? sortDir,
        CancellationToken ct) =>
        Ok(await Sender.Send(new GetOrdersQuery(q, searchField, status, fromDate, toDate, weightFrom, weightTo,
            page, pageSize, sortBy, sortDir), ct));

    /// <summary>
    /// Trang in chứng từ (HTML, tự mở hộp thoại in): doc = bill-a4 | invoice | cvck | label-a6;
    /// bills = danh sách số vận đơn ngăn bằng dấu phẩy (tối đa 100).
    /// </summary>
    [HttpGet("print")]
    [HasPermission(ShipmentsPermissions.View)]
    [Produces("text/html")]
    public async Task<IActionResult> Print([FromQuery] string? bills, [FromQuery] string? doc, CancellationToken ct)
    {
        var list = (bills ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var result = await Sender.Send(new PrintOrdersQuery(list, doc ?? ""), ct);
        return result.IsSuccess ? Content(result.Value, "text/html; charset=utf-8") : Problem(result.Error);
    }

    /// <summary>Xuất bảng kê gửi hàng (.xlsx) theo cùng bộ lọc với danh sách đơn.</summary>
    [HttpGet("export")]
    [HasPermission(ShipmentsPermissions.View)]
    [Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]
    public async Task<IActionResult> Export(
        [FromQuery] string? q, [FromQuery] string? searchField, [FromQuery] string? status,
        [FromQuery] DateOnly? fromDate, [FromQuery] DateOnly? toDate,
        [FromQuery] decimal? weightFrom, [FromQuery] decimal? weightTo,
        [FromQuery] string? sortBy, [FromQuery] string? sortDir, CancellationToken ct)
    {
        var file = await Sender.Send(new ExportOrdersQuery(
            new GetOrdersQuery(q, searchField, status, fromDate, toDate, weightFrom, weightTo, null, null, sortBy, sortDir)), ct);
        return File(file.Content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", file.FileName);
    }

    /// <summary>Chi tiết 1 đơn theo số VA hoặc mã hãng.</summary>
    [HttpGet("{bill}")]
    [HasPermission(ShipmentsPermissions.View)]
    [ProducesResponseType<ApiResponse<OrderDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(string bill, CancellationToken ct) =>
        FromResult(await Sender.Send(new GetOrderQuery(bill), ct));

    [HttpGet("{bill}/events")]
    [HasPermission(ShipmentsPermissions.View)]
    [ProducesResponseType<ApiResponse<IReadOnlyList<OrderEventDto>>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Events(string bill, CancellationToken ct) =>
        FromResult(await Sender.Send(new GetOrderEventsQuery(bill), ct));

    /// <summary>Tạo nhiều đơn (≤ 100) từ file Excel — ghi thẳng vào dbo.MaVanDon.</summary>
    [HttpPost("batch")]
    [HasPermission(ShipmentsPermissions.Create)]
    [ProducesResponseType<ApiResponse<IReadOnlyList<OrderDto>>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Batch(BatchRequest body, CancellationToken ct)
    {
        var result = await Sender.Send(new CreateOrdersBatchCommand(body.Orders ?? []), ct);
        return FromResult(result, result.IsSuccess ? $"Đã tạo {result.Value.Count} đơn" : null);
    }
}

/// <summary>Đơn nháp &amp; chưa in — hợp đồng frontend: web/docs/API_CONTRACT.md §2.</summary>
[ApiVersion(1)]
[Route("api/v{version:apiVersion}/drafts")]
[Tags("Đơn hàng")]
internal sealed class DraftsController : ApiControllerBase
{
    [HttpGet]
    [HasPermission(ShipmentsPermissions.View)]
    [ProducesResponseType<ApiResponse<IReadOnlyList<DraftDto>>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct) => OkData(await Sender.Send(new GetDraftsQuery(), ct));

    [HttpPost]
    [HasPermission(ShipmentsPermissions.Create)]
    [ProducesResponseType<ApiResponse<DraftDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Create(DraftInput body, CancellationToken ct) =>
        FromResult(await Sender.Send(new SaveDraftCommand(null, body), ct),
            body.Stt == Domain.OrderDraft.StatusReady ? "Đã lưu đơn, chờ in" : "Đã lưu nháp");

    [HttpPut("{id:guid}")]
    [HasPermission(ShipmentsPermissions.Update)]
    [ProducesResponseType<ApiResponse<DraftDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid id, DraftInput body, CancellationToken ct) =>
        FromResult(await Sender.Send(new SaveDraftCommand(id, body), ct), "Đã cập nhật đơn nháp");

    [HttpDelete("{id:guid}")]
    [HasPermission(ShipmentsPermissions.Update)]
    [ProducesResponseType<ApiMessage>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) =>
        FromResult(await Sender.Send(new DeleteDraftCommand(id), ct), "Đã xoá đơn nháp");

    /// <summary>In &amp; cấp bill: cấp số vận đơn (dải riêng của portal), ghi vào dbo.MaVanDon, xoá nháp.</summary>
    [HttpPost("{id:guid}/print")]
    [HasPermission(ShipmentsPermissions.IssueBill)]
    [ProducesResponseType<PrintDraftResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Print(Guid id, CancellationToken ct)
    {
        var result = await Sender.Send(new PrintDraftCommand(id), ct);
        return result.IsSuccess ? Ok(result.Value) : Problem(result.Error);
    }
}

internal sealed record BatchRequest(IReadOnlyList<BatchOrderRow>? Orders);
