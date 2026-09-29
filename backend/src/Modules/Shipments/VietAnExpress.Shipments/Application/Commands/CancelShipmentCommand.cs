using Mapster;
using MediatR;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Infrastructure;

namespace VietAnExpress.Shipments.Application.Commands;

internal sealed record CancelShipmentCommand(Guid Id, string Reason) : IRequest<Result<ShipmentDetailDto>>;

internal sealed class CancelShipmentHandler(ShipmentsDbContext db, ICurrentUser user, TimeProvider clock)
    : IRequestHandler<CancelShipmentCommand, Result<ShipmentDetailDto>>
{
    public async Task<Result<ShipmentDetailDto>> Handle(CancelShipmentCommand cmd, CancellationToken ct)
    {
        var shipment = await db.FindForUpdateAsync(cmd.Id, user, ct);
        if (shipment is null) return ShipmentErrors.NotFound(cmd.Id);

        shipment.Cancel(cmd.Reason, clock.GetUtcNow());
        await db.SaveChangesAsync(ct);
        return shipment.Adapt<ShipmentDetailDto>();
    }
}
