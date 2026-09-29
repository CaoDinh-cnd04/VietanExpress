using VietAnExpress.SharedKernel.Domain;

namespace VietAnExpress.Customers.Domain;

/// <summary>Khách hàng (doanh nghiệp / shop) gửi hàng qua Việt An.</summary>
internal sealed class Customer : BaseEntity
{
    private Customer() { } // EF Core

    public Customer(string code, CustomerProfile profile, Guid? branchId)
    {
        Code = code;
        BranchId = branchId;
        IsActive = true;
        Update(profile);
    }

    /// <summary>Mã khách hàng nghiệp vụ (vd KH000123) — khác khoá chính, không đổi sau khi tạo.</summary>
    public string Code { get; private set; } = null!;
    public string CompanyName { get; private set; } = null!;
    public string? TaxCode { get; private set; }
    public string? ContactName { get; private set; }
    public string? Phone { get; private set; }
    public string? Email { get; private set; }
    public string? Address { get; private set; }
    public string? Note { get; private set; }
    public bool IsActive { get; private set; }

    /// <summary>CustomerID bên hệ thống cũ (dbo.TCustomer) — có giá trị nếu khách được chuyển sang từ hệ thống cũ.</summary>
    public long? LegacyId { get; private set; }

    /// <summary>Số đơn đã cấp bill — cập nhật qua integration event từ Shipments.</summary>
    public int TotalShipments { get; private set; }
    public DateTimeOffset? LastShipmentAt { get; private set; }

    public void Update(CustomerProfile profile)
    {
        CompanyName = profile.CompanyName.Trim();
        TaxCode = profile.TaxCode?.Trim();
        ContactName = profile.ContactName?.Trim();
        Phone = profile.Phone?.Trim();
        Email = profile.Email?.Trim();
        Address = profile.Address?.Trim();
        Note = profile.Note?.Trim();
    }

    public void LinkLegacy(long legacyId) => LegacyId = legacyId;

    public void SetActive(bool isActive) => IsActive = isActive;

    public void RegisterShipment(DateTimeOffset bookedAt)
    {
        TotalShipments++;
        if (LastShipmentAt is null || bookedAt > LastShipmentAt) LastShipmentAt = bookedAt;
    }
}

internal sealed record CustomerProfile(
    string CompanyName,
    string? TaxCode,
    string? ContactName,
    string? Phone,
    string? Email,
    string? Address,
    string? Note);
