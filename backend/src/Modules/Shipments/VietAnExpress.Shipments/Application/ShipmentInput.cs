using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Domain;

namespace VietAnExpress.Shipments.Application;

/// <summary>Thông tin vận đơn khách nhập — dùng chung cho tạo và sửa nháp.</summary>
internal sealed record ShipmentInput(
    ContentType ContentType,
    string ServiceCode,
    AddressDto Sender,
    AddressDto Receiver,
    string GoodsDescription,
    MoneyDto DeclaredValue,
    IReadOnlyList<PackageDto> Packages,
    string? CustomerReference)
{
    /// <summary>Đổi sang value object domain — constructor domain tự kiểm tra bất biến.</summary>
    public ShipmentDetails ToDetails() => new(
        ContentType,
        ServiceCode,
        ToAddress(Sender),
        ToAddress(Receiver),
        GoodsDescription,
        new Money(DeclaredValue.Amount, DeclaredValue.Currency),
        Packages.Select(p => new PackageSpec(p.Quantity, p.WeightKg, p.LengthCm, p.WidthCm, p.HeightCm)).ToList(),
        CustomerReference);

    private static Address ToAddress(AddressDto a) => new(
        a.ContactName, a.Phone, a.Line1, a.Line2, a.City, a.State, a.PostalCode, a.CountryCode, a.CompanyName, a.Email);
}
