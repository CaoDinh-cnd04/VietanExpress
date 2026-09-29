using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VietAnExpress.Customers.Contracts;
using VietAnExpress.Customers.Domain;
using VietAnExpress.Customers.Infrastructure;
using VietAnExpress.Customers.Infrastructure.Legacy;

namespace VietAnExpress.Customers.Application;

/// <summary>Triển khai <see cref="ICustomersApi"/> cho module khác gọi đồng bộ.</summary>
internal sealed class CustomersApi(
    CustomersDbContext db,
    ICustomerCodeGenerator codes,
    ILegacyCustomerReader legacy,
    ILogger<CustomersApi> logger) : ICustomersApi
{
    public Task<CustomerSummary?> GetByIdAsync(Guid customerId, CancellationToken cancellationToken = default) =>
        db.Customers.AsNoTracking()
            .Where(c => c.Id == customerId)
            .Select(ToSummary)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyDictionary<Guid, CustomerSummary>> GetByIdsAsync(
        IReadOnlyCollection<Guid> customerIds, CancellationToken cancellationToken = default)
    {
        if (customerIds.Count == 0) return new Dictionary<Guid, CustomerSummary>();

        var ids = customerIds.Distinct().ToList();
        return await db.Customers.AsNoTracking()
            .Where(c => ids.Contains(c.Id))
            .Select(ToSummary)
            .ToDictionaryAsync(c => c.Id, cancellationToken);
    }

    public async Task<CustomerSummary?> ImportLegacyCustomerAsync(long legacyCustomerId, CancellationToken cancellationToken = default)
    {
        var existing = await db.Customers.AsNoTracking()
            .Where(c => c.LegacyId == legacyCustomerId)
            .Select(ToSummary)
            .FirstOrDefaultAsync(cancellationToken);
        if (existing is not null) return existing;

        var row = await legacy.FindAsync(legacyCustomerId, cancellationToken);
        if (row is null) return null;

        // Giữ mã khách cũ nếu hợp lệ và chưa bị dùng; không thì sinh mã mới.
        var code = Clip(row.CustomerCode, 20)?.ToUpperInvariant();
        if (code is null || await db.Customers.IgnoreQueryFilters().AnyAsync(c => c.Code == code, cancellationToken))
            code = await codes.NextAsync(cancellationToken);

        var customer = new Customer(code, new CustomerProfile(
            CompanyName: Clip(row.CustomerName, 250) ?? code,
            TaxCode: Clip(row.TaxCode, 50),
            ContactName: Clip(row.ContactName, 150),
            Phone: Clip(row.ContactPhone ?? row.Phone, 50),
            Email: Clip(FirstEmail(row.ContactEmail) ?? FirstEmail(row.Email), 150),
            Address: Clip(row.Address1, 500),
            Note: $"Chuyển từ hệ thống cũ (CustomerID {row.CustomerID})"), branchId: null);
        customer.LinkLegacy(row.CustomerID);

        db.Customers.Add(customer);
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Đã chuyển khách cũ {LegacyId} sang {Code}", row.CustomerID, code);
        return ToSummary.Compile()(customer);
    }

    private static string? Clip(string? value, int max)
    {
        var v = value?.Trim();
        return string.IsNullOrEmpty(v) ? null : v.Length <= max ? v : v[..max];
    }

    /// <summary>Cột email cũ có thể chứa nhiều địa chỉ ngăn bởi ; hoặc , — lấy địa chỉ đầu tiên.</summary>
    private static string? FirstEmail(string? value) =>
        value?.Split([';', ',', ' '], StringSplitOptions.RemoveEmptyEntries).FirstOrDefault(e => e.Contains('@'));

    private static readonly System.Linq.Expressions.Expression<Func<Customer, CustomerSummary>> ToSummary = c =>
        new CustomerSummary(c.Id, c.Code, c.CompanyName, c.ContactName, c.Email, c.Phone, c.BranchId, c.IsActive, c.LegacyId);
}
