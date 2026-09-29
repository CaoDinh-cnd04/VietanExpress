using Mapster;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Domain;

namespace VietAnExpress.Shipments.Application;

/// <summary>Cấu hình Mapster cho module — được quét khi đăng ký module.</summary>
internal sealed class ShipmentsMappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        // Hành trình: mới nhất trước.
        config.NewConfig<Shipment, ShipmentDetailDto>()
            .Map(d => d.TrackingEvents, s => s.TrackingEvents.OrderByDescending(e => e.OccurredAt).ToList())
            .Map(d => d.Packages, s => s.Packages.ToList());
    }
}
