using Mapster;
using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Infrastructure;

namespace VietAnExpress.Shipments.Application.Queries;

internal sealed record GetShipmentByIdQuery(Guid Id) : IRequest<Result<ShipmentDetailDto>>;

internal sealed record GetShipmentByCodeQuery(string Code) : IRequest<Result<ShipmentDetailDto>>;

internal sealed class GetShipmentHandlers(ShipmentsDbContext db, ICurrentUser user) :
    IRequestHandler<GetShipmentByIdQuery, Result<ShipmentDetailDto>>,
    IRequestHandler<GetShipmentByCodeQuery, Result<ShipmentDetailDto>>
{
    public async Task<Result<ShipmentDetailDto>> Handle(GetShipmentByIdQuery q, CancellationToken ct)
    {
        var shipment = await db.Shipments.AsNoTracking().VisibleTo(user).WithDetails()
            .FirstOrDefaultAsync(s => s.Id == q.Id, ct);
        return shipment is null ? ShipmentErrors.NotFound(q.Id) : shipment.Adapt<ShipmentDetailDto>();
    }

    public async Task<Result<ShipmentDetailDto>> Handle(GetShipmentByCodeQuery q, CancellationToken ct)
    {
        var code = q.Code.Trim().ToUpperInvariant();
        var shipment = await db.Shipments.AsNoTracking().VisibleTo(user).WithDetails()
            .FirstOrDefaultAsync(s => s.Code == code, ct);
        return shipment is null ? ShipmentErrors.NotFound(code) : shipment.Adapt<ShipmentDetailDto>();
    }
}
