using VietAnExpress.SharedKernel.Exceptions;

namespace VietAnExpress.Shipments.Domain;

/// <summary>
/// 1 dòng kiện trong vận đơn (n kiện cùng kích thước, cân nặng).
/// Là entity con của aggregate Shipment: chỉ tạo / xoá qua Shipment, audit nằm ở Shipment.
/// </summary>
internal sealed class ShipmentPackage
{
    private ShipmentPackage() { } // EF Core

    internal ShipmentPackage(PackageSpec spec)
    {
        if (spec.Quantity <= 0)
            throw new DomainException("PACKAGE_INVALID_QUANTITY", "Số lượng kiện phải lớn hơn 0");
        if (spec.WeightKg <= 0)
            throw new DomainException("PACKAGE_INVALID_WEIGHT", "Cân nặng kiện phải lớn hơn 0");
        if (spec.LengthCm < 0 || spec.WidthCm < 0 || spec.HeightCm < 0)
            throw new DomainException("PACKAGE_INVALID_DIMENSION", "Kích thước kiện không được âm");

        Quantity = spec.Quantity;
        WeightKg = spec.WeightKg;
        LengthCm = spec.LengthCm;
        WidthCm = spec.WidthCm;
        HeightCm = spec.HeightCm;
    }

    public Guid Id { get; private set; } = Guid.CreateVersion7();
    public int Quantity { get; private set; }
    /// <summary>Cân nặng 1 kiện (kg).</summary>
    public decimal WeightKg { get; private set; }
    public decimal LengthCm { get; private set; }
    public decimal WidthCm { get; private set; }
    public decimal HeightCm { get; private set; }

    /// <summary>Cân thực của cả dòng = cân 1 kiện × số lượng.</summary>
    public decimal ActualWeightKg => ShippingRules.Round(WeightKg * Quantity);

    /// <summary>Cân quy đổi của cả dòng = D × R × C / 5000 × số lượng.</summary>
    public decimal VolumetricWeightKg =>
        ShippingRules.Round(LengthCm * WidthCm * HeightCm * Quantity / ShippingRules.VolumetricDivisor);
}

/// <summary>Kích thước, cân nặng khách khai cho 1 dòng kiện.</summary>
internal sealed record PackageSpec(int Quantity, decimal WeightKg, decimal LengthCm, decimal WidthCm, decimal HeightCm);

/// <summary>1 mốc hành trình của vận đơn.</summary>
internal sealed class ShipmentTrackingEvent
{
    private ShipmentTrackingEvent() { } // EF Core

    internal ShipmentTrackingEvent(DateTimeOffset occurredAt, string description, string? location, bool isPublic)
    {
        if (string.IsNullOrWhiteSpace(description))
            throw new DomainException("TRACKING_EVENT_EMPTY", "Nội dung hành trình không được trống");

        OccurredAt = occurredAt;
        Description = description.Trim();
        Location = string.IsNullOrWhiteSpace(location) ? null : location.Trim();
        IsPublic = isPublic;
    }

    public Guid Id { get; private set; } = Guid.CreateVersion7();
    public DateTimeOffset OccurredAt { get; private set; }
    public string Description { get; private set; } = null!;
    public string? Location { get; private set; }

    /// <summary>false = ghi chú nội bộ, không hiện trên tra cứu công khai.</summary>
    public bool IsPublic { get; private set; }
}
