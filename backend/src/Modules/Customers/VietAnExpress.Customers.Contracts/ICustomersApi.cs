namespace VietAnExpress.Customers.Contracts;

/// <summary>
/// Cổng gọi đồng bộ vào module Customers cho module khác.
/// Module khác KHÔNG truy cập bảng customers.* trực tiếp — chỉ qua interface này.
/// </summary>
public interface ICustomersApi
{
    Task<CustomerSummary?> GetByIdAsync(Guid customerId, CancellationToken cancellationToken = default);

    /// <summary>Lấy nhiều khách một lần (tránh N+1 khi hiển thị danh sách). Id không tồn tại thì bỏ qua.</summary>
    Task<IReadOnlyDictionary<Guid, CustomerSummary>> GetByIdsAsync(
        IReadOnlyCollection<Guid> customerIds, CancellationToken cancellationToken = default);

    /// <summary>
    /// Chuyển 1 khách từ hệ thống cũ (dbo.TCustomer) sang module Customers — chạy 1 lần, gọi lại trả khách đã chuyển.
    /// Null nếu không có khách cũ với Id này. Dùng khi khách cũ đăng nhập lần đầu vào portal mới.
    /// </summary>
    Task<CustomerSummary?> ImportLegacyCustomerAsync(long legacyCustomerId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Thông tin khách đủ dùng cho module khác — không lộ toàn bộ hồ sơ.
/// <see cref="LegacyId"/>: CustomerID ở hệ thống cũ (dbo.TCustomer) — cần để đọc / ghi đơn trong dbo.MaVanDon.
/// </summary>
public sealed record CustomerSummary(
    Guid Id,
    string Code,
    string CompanyName,
    string? ContactName,
    string? Email,
    string? Phone,
    Guid? BranchId,
    bool IsActive,
    long? LegacyId = null);

public static class CustomersPermissions
{
    public const string View = "customers.view";
    public const string Manage = "customers.manage";
}
