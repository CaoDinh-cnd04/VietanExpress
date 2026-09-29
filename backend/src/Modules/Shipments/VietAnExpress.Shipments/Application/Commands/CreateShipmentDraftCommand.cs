using Mapster;
using MediatR;
using VietAnExpress.Customers.Contracts;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Domain;
using VietAnExpress.Shipments.Infrastructure;

namespace VietAnExpress.Shipments.Application.Commands;

/// <param name="CustomerId">Nhân viên tạo hộ khách thì bắt buộc; tài khoản khách hàng thì bỏ qua (luôn là chính khách đó).</param>
internal sealed record CreateShipmentDraftCommand(Guid? CustomerId, ShipmentInput Shipment) : IRequest<Result<ShipmentDetailDto>>;

internal sealed class CreateShipmentDraftHandler(ShipmentsDbContext db, ICustomersApi customers, ICurrentUser user)
    : IRequestHandler<CreateShipmentDraftCommand, Result<ShipmentDetailDto>>
{
    public async Task<Result<ShipmentDetailDto>> Handle(CreateShipmentDraftCommand cmd, CancellationToken ct)
    {
        var customerId = user.CustomerId ?? cmd.CustomerId;
        if (customerId is null) return ShipmentErrors.CustomerRequired;

        // Lấy thông tin khách qua Contracts — không đọc bảng customers.* trực tiếp.
        var customer = await customers.GetByIdAsync(customerId.Value, ct);
        if (customer is null) return ShipmentErrors.CustomerNotFound;
        if (!customer.IsActive) return ShipmentErrors.CustomerInactive;

        var shipment = Shipment.CreateDraft(customer.Id, cmd.Shipment.ToDetails(), customer.BranchId ?? user.BranchId);
        db.Shipments.Add(shipment);
        await db.SaveChangesAsync(ct);
        return shipment.Adapt<ShipmentDetailDto>();
    }
}
