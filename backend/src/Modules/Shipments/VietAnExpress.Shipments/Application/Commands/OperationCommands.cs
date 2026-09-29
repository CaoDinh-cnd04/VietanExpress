using Mapster;
using MediatR;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Domain;
using VietAnExpress.Shipments.Infrastructure;

namespace VietAnExpress.Shipments.Application.Commands;

// Nghiệp vụ vận hành (kho, giao nhận): xuất hàng, cập nhật hành trình, xác nhận giao / giao lỗi.
// Cùng 1 khuôn: tải aggregate → gọi method domain → lưu → trả chi tiết đơn.

internal sealed record DispatchShipmentCommand(Guid Id, string? Location) : IRequest<Result<ShipmentDetailDto>>;

internal sealed record AddTrackingEventCommand(Guid Id, DateTimeOffset OccurredAt, string Description, string? Location, bool IsPublic)
    : IRequest<Result<ShipmentDetailDto>>;

internal sealed record MarkDeliveredCommand(Guid Id, string ReceivedBy, DateTimeOffset? DeliveredAt) : IRequest<Result<ShipmentDetailDto>>;

internal sealed record MarkDeliveryFailedCommand(Guid Id, string Reason) : IRequest<Result<ShipmentDetailDto>>;

internal sealed class ShipmentOperationHandlers(ShipmentsDbContext db, ICurrentUser user, TimeProvider clock) :
    IRequestHandler<DispatchShipmentCommand, Result<ShipmentDetailDto>>,
    IRequestHandler<AddTrackingEventCommand, Result<ShipmentDetailDto>>,
    IRequestHandler<MarkDeliveredCommand, Result<ShipmentDetailDto>>,
    IRequestHandler<MarkDeliveryFailedCommand, Result<ShipmentDetailDto>>
{
    public Task<Result<ShipmentDetailDto>> Handle(DispatchShipmentCommand cmd, CancellationToken ct) =>
        Apply(cmd.Id, (s, now) => s.Dispatch(now, cmd.Location), ct);

    public Task<Result<ShipmentDetailDto>> Handle(AddTrackingEventCommand cmd, CancellationToken ct) =>
        Apply(cmd.Id, (s, now) => s.AddTrackingEvent(cmd.OccurredAt, cmd.Description, cmd.Location, cmd.IsPublic, now), ct);

    public Task<Result<ShipmentDetailDto>> Handle(MarkDeliveredCommand cmd, CancellationToken ct) =>
        Apply(cmd.Id, (s, now) => s.MarkAsDelivered(cmd.ReceivedBy, cmd.DeliveredAt ?? now, now), ct);

    public Task<Result<ShipmentDetailDto>> Handle(MarkDeliveryFailedCommand cmd, CancellationToken ct) =>
        Apply(cmd.Id, (s, now) => s.MarkDeliveryFailed(cmd.Reason, now), ct);

    private async Task<Result<ShipmentDetailDto>> Apply(Guid id, Action<Shipment, DateTimeOffset> action, CancellationToken ct)
    {
        var shipment = await db.FindForUpdateAsync(id, user, ct);
        if (shipment is null) return ShipmentErrors.NotFound(id);

        action(shipment, clock.GetUtcNow());
        await db.SaveChangesAsync(ct);
        return shipment.Adapt<ShipmentDetailDto>();
    }
}
