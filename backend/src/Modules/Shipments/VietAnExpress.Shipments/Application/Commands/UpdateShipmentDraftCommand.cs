using Mapster;
using MediatR;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Infrastructure;

namespace VietAnExpress.Shipments.Application.Commands;

internal sealed record UpdateShipmentDraftCommand(Guid Id, ShipmentInput Shipment) : IRequest<Result<ShipmentDetailDto>>;

internal sealed class UpdateShipmentDraftHandler(ShipmentsDbContext db, ICurrentUser user)
    : IRequestHandler<UpdateShipmentDraftCommand, Result<ShipmentDetailDto>>
{
    public async Task<Result<ShipmentDetailDto>> Handle(UpdateShipmentDraftCommand cmd, CancellationToken ct)
    {
        var shipment = await db.FindForUpdateAsync(cmd.Id, user, ct);
        if (shipment is null) return ShipmentErrors.NotFound(cmd.Id);

        shipment.UpdateDraft(cmd.Shipment.ToDetails());
        await db.SaveChangesAsync(ct);
        return shipment.Adapt<ShipmentDetailDto>();
    }
}
