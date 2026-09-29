namespace VietAnExpress.Customers.Application.Dtos;

internal sealed record CustomerDto(
    Guid Id,
    string Code,
    string CompanyName,
    string? TaxCode,
    string? ContactName,
    string? Phone,
    string? Email,
    string? Address,
    string? Note,
    bool IsActive,
    int TotalShipments,
    DateTimeOffset? LastShipmentAt,
    Guid? BranchId,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);
