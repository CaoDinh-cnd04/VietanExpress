using Mapster;
using MediatR;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Infrastructure;

namespace VietAnExpress.Shipments.Application.Commands;

/// <summary>"In &amp; cấp bill": cấp mã vận đơn, khoá đơn, bắt đầu hành trình.</summary>
internal sealed record IssueBillCommand(Guid Id) : IRequest<Result<ShipmentDetailDto>>;

internal sealed class IssueBillHandler(ShipmentsDbContext db, IShipmentCodeGenerator codes, ICurrentUser user, TimeProvider clock)
    : IRequestHandler<IssueBillCommand, Result<ShipmentDetailDto>>
{
    public async Task<Result<ShipmentDetailDto>> Handle(IssueBillCommand cmd, CancellationToken ct)
    {
        var shipment = await db.FindForUpdateAsync(cmd.Id, user, ct);
        if (shipment is null) return ShipmentErrors.NotFound(cmd.Id);

        // Lấy mã trước rồi domain mới kiểm tra trạng thái: nếu bị từ chối thì sequence có "lỗ hổng" 1 số — chấp nhận được,
        // đổi lại không phải giữ khoá DB trong lúc kiểm tra.
        var code = await codes.NextAsync(ct);
        shipment.IssueBill(code, clock.GetUtcNow());
        await db.SaveChangesAsync(ct);
        return shipment.Adapt<ShipmentDetailDto>();
    }
}
