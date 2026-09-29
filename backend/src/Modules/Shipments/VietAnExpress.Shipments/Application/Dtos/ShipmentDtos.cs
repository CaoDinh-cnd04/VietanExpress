using System.Text.Json.Serialization;
using VietAnExpress.Shipments.Domain;

namespace VietAnExpress.Shipments.Application.Dtos;

internal sealed record AddressDto(
    string ContactName,
    string? CompanyName,
    string Phone,
    string? Email,
    string Line1,
    string? Line2,
    string City,
    string? State,
    string? PostalCode,
    string CountryCode);

internal sealed record MoneyDto(decimal Amount, string Currency);

internal sealed record PackageDto(int Quantity, decimal WeightKg, decimal LengthCm, decimal WidthCm, decimal HeightCm);

internal sealed record TrackingEventDto(DateTimeOffset OccurredAt, string Description, string? Location, bool IsPublic);

internal sealed record ShipmentDetailDto(
    Guid Id,
    string? Code,
    Guid CustomerId,
    string? CustomerReference,
    ShipmentStatus Status,
    ContentType ContentType,
    string ServiceCode,
    AddressDto Sender,
    AddressDto Receiver,
    string GoodsDescription,
    MoneyDto DeclaredValue,
    int TotalPieces,
    decimal ActualWeightKg,
    decimal VolumetricWeightKg,
    decimal ChargeableWeightKg,
    bool IsEditable,
    IReadOnlyList<PackageDto> Packages,
    IReadOnlyList<TrackingEventDto> TrackingEvents,
    DateTimeOffset CreatedAt,
    DateTimeOffset? BillIssuedAt,
    DateTimeOffset? DispatchedAt,
    DateTimeOffset? DeliveredAt,
    string? ReceivedBy,
    string? LastFailureReason,
    DateTimeOffset? CancelledAt,
    string? CancelReason);

internal sealed record ShipmentListItemDto(
    Guid Id,
    string? Code,
    Guid CustomerId,
    string? CustomerName,
    string? CustomerReference,
    ShipmentStatus Status,
    string ServiceCode,
    string ReceiverName,
    string ReceiverCity,
    string ReceiverCountryCode,
    int TotalPieces,
    decimal ChargeableWeightKg,
    DateTimeOffset CreatedAt,
    DateTimeOffset? BillIssuedAt);

/// <summary>
/// Kết quả tra cứu công khai — chỉ thông tin không nhạy cảm (không tên, địa chỉ, số điện thoại).
/// Dạng JSON khớp <c>TrackResult</c> của frontend (web/src/features/landing/types.ts).
/// </summary>
internal sealed record PublicTrackResultDto(
    string Bill,
    bool Found,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Status = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Destination = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Service = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] IReadOnlyList<PublicTrackEventDto>? Events = null);

/// <param name="Time">Giờ Việt Nam, dd/MM/yyyy HH:mm.</param>
internal sealed record PublicTrackEventDto(string Time, string Title, string? Location);
