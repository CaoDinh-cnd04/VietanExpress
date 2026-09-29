using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using VietAnExpress.SharedKernel.Authorization;
using VietAnExpress.SharedKernel.Web;
using VietAnExpress.Shipments.Application;
using VietAnExpress.Shipments.Application.Commands;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Application.Queries;
using VietAnExpress.Shipments.Contracts;
using VietAnExpress.Shipments.Domain;

namespace VietAnExpress.Shipments.Api;

[ApiVersion(1)]
[Route("api/v{version:apiVersion}/shipments")]
[Tags("Vận đơn")]
internal sealed class ShipmentsController : ApiControllerBase
{
    /// <summary>Danh sách vận đơn. Tài khoản khách hàng chỉ thấy đơn của mình.</summary>
    [HttpGet]
    [HasPermission(ShipmentsPermissions.View)]
    [ProducesResponseType<ApiListResponse<ShipmentListItemDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? search, [FromQuery] ShipmentStatus? status, [FromQuery] Guid? customerId,
        [FromQuery] DateOnly? fromDate, [FromQuery] DateOnly? toDate, [FromQuery] int? page, [FromQuery] int? pageSize,
        CancellationToken ct) =>
        FromPaged(await Sender.Send(new GetShipmentsQuery(search, status, customerId, fromDate, toDate, page, pageSize), ct));

    [HttpGet("{id:guid}")]
    [HasPermission(ShipmentsPermissions.View)]
    [ProducesResponseType<ApiResponse<ShipmentDetailDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) =>
        FromResult(await Sender.Send(new GetShipmentByIdQuery(id), ct));

    [HttpGet("by-code/{code}")]
    [HasPermission(ShipmentsPermissions.View)]
    [ProducesResponseType<ApiResponse<ShipmentDetailDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByCode(string code, CancellationToken ct) =>
        FromResult(await Sender.Send(new GetShipmentByCodeQuery(code), ct));

    /// <summary>Tạo đơn nháp.</summary>
    [HttpPost]
    [HasPermission(ShipmentsPermissions.Create)]
    [ProducesResponseType<ApiResponse<ShipmentDetailDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Create(CreateShipmentDraftCommand command, CancellationToken ct) =>
        FromResult(await Sender.Send(command, ct), "Đã lưu đơn nháp");

    /// <summary>Sửa đơn nháp (đơn đã cấp bill thì bị khoá).</summary>
    [HttpPut("{id:guid}")]
    [HasPermission(ShipmentsPermissions.Update)]
    [ProducesResponseType<ApiResponse<ShipmentDetailDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid id, ShipmentInput shipment, CancellationToken ct) =>
        FromResult(await Sender.Send(new UpdateShipmentDraftCommand(id, shipment), ct), "Đã cập nhật đơn nháp");

    /// <summary>In &amp; cấp bill: cấp mã vận đơn và khoá đơn.</summary>
    [HttpPost("{id:guid}/issue-bill")]
    [HasPermission(ShipmentsPermissions.IssueBill)]
    [ProducesResponseType<ApiResponse<ShipmentDetailDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> IssueBill(Guid id, CancellationToken ct) =>
        FromResult(await Sender.Send(new IssueBillCommand(id), ct), "Đã cấp mã vận đơn");

    [HttpPost("{id:guid}/cancel")]
    [HasPermission(ShipmentsPermissions.Cancel)]
    [ProducesResponseType<ApiResponse<ShipmentDetailDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(Guid id, ReasonRequest body, CancellationToken ct) =>
        FromResult(await Sender.Send(new CancelShipmentCommand(id, body.Reason), ct), "Đã huỷ vận đơn");

    // ----- Vận hành (kho / giao nhận) -----

    [HttpPost("{id:guid}/dispatch")]
    [HasPermission(ShipmentsPermissions.Operate)]
    [ProducesResponseType<ApiResponse<ShipmentDetailDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Dispatch(Guid id, DispatchRequest body, CancellationToken ct) =>
        FromResult(await Sender.Send(new DispatchShipmentCommand(id, body.Location), ct), "Đã xuất hàng");

    [HttpPost("{id:guid}/tracking-events")]
    [HasPermission(ShipmentsPermissions.Operate)]
    [ProducesResponseType<ApiResponse<ShipmentDetailDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> AddTrackingEvent(Guid id, TrackingEventRequest body, CancellationToken ct) =>
        FromResult(await Sender.Send(new AddTrackingEventCommand(id, body.OccurredAt, body.Description, body.Location, body.IsPublic), ct),
            "Đã cập nhật hành trình");

    [HttpPost("{id:guid}/deliver")]
    [HasPermission(ShipmentsPermissions.Operate)]
    [ProducesResponseType<ApiResponse<ShipmentDetailDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Deliver(Guid id, DeliverRequest body, CancellationToken ct) =>
        FromResult(await Sender.Send(new MarkDeliveredCommand(id, body.ReceivedBy, body.DeliveredAt), ct), "Đã xác nhận giao hàng");

    [HttpPost("{id:guid}/delivery-failed")]
    [HasPermission(ShipmentsPermissions.Operate)]
    [ProducesResponseType<ApiResponse<ShipmentDetailDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> DeliveryFailed(Guid id, ReasonRequest body, CancellationToken ct) =>
        FromResult(await Sender.Send(new MarkDeliveryFailedCommand(id, body.Reason), ct), "Đã ghi nhận giao không thành công");
}

internal sealed record ReasonRequest(string Reason);

internal sealed record DispatchRequest(string? Location);

internal sealed record TrackingEventRequest(DateTimeOffset OccurredAt, string Description, string? Location, bool IsPublic = true);

/// <param name="DeliveredAt">Bỏ trống = thời điểm hiện tại.</param>
internal sealed record DeliverRequest(string ReceivedBy, DateTimeOffset? DeliveredAt);
