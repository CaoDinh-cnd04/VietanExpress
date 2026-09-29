using Mapster;
using VietAnExpress.Shipments.Application;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Domain;

namespace VietAnExpress.Shipments.Tests;

internal static class TestData
{
    public static readonly DateTimeOffset Now = new(2026, 9, 29, 3, 0, 0, TimeSpan.Zero);

    static TestData() => TypeAdapterConfig.GlobalSettings.Scan(ShipmentsModule.Assembly);

    public static Address Address(string country = "VN", string city = "Hồ Chí Minh") =>
        new("Nguyễn Văn A", "0909000000", "14 Sam Sơn", null, city, null, "72106", country);

    public static ShipmentDetails Details(
        ContentType type = ContentType.Package, params PackageSpec[] packages) =>
        new(type, "dhl", Address(), Address("SG", "Singapore"), "Dây đồng hồ", new Money(10, "usd"),
            packages.Length == 0 ? [new PackageSpec(1, 1.5m, 30, 20, 10)] : packages, "SHOP-001");

    public static ShipmentInput Input(params PackageDto[] packages) => new(
        ContentType.Package, "DHL",
        new AddressDto("Nguyễn Văn A", null, "0909000000", null, "14 Sam Sơn", null, "Hồ Chí Minh", null, "72106", "VN"),
        new AddressDto("Lynn Tan", null, "+65 9793 6402", null, "4 Ghim Moh Road", null, "Singapore", null, "270004", "SG"),
        "Watch strap", new MoneyDto(10, "SGD"),
        packages.Length == 0 ? [new PackageDto(1, 0.1m, 10, 10, 5)] : packages, null);

    /// <summary>Mã vận đơn ngẫu nhiên — các test dùng chung 1 database nên không được trùng unique index.</summary>
    public static string UniqueCode() => "VT" + Random.Shared.NextInt64(10_000_000_000, 99_999_999_999);

    /// <summary>Đơn đã qua các bước tới trạng thái mong muốn.</summary>
    public static Shipment ShipmentIn(ShipmentStatus status, Guid? customerId = null, string? code = null)
    {
        code ??= UniqueCode();
        var shipment = Shipment.CreateDraft(customerId ?? Guid.NewGuid(), Details(), branchId: null);
        if (status == ShipmentStatus.Draft) return shipment;
        shipment.IssueBill(code, Now);
        if (status == ShipmentStatus.Booked) return shipment;
        if (status == ShipmentStatus.Cancelled) { shipment.Cancel("Khách đổi ý", Now); return shipment; }
        shipment.Dispatch(Now.AddHours(1), "Kho TP.HCM");
        if (status == ShipmentStatus.InTransit) return shipment;
        if (status == ShipmentStatus.DeliveryFailed) { shipment.MarkDeliveryFailed("Vắng nhà", Now.AddDays(2)); return shipment; }
        shipment.MarkAsDelivered("Lynn Tan", Now.AddDays(3), Now.AddDays(3));
        return shipment;
    }
}

/// <summary>Đồng hồ cố định cho test.</summary>
internal sealed class FixedClock(DateTimeOffset now) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => now;
}
