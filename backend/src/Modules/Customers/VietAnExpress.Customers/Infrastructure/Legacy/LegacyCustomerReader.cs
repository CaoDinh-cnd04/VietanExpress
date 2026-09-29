using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace VietAnExpress.Customers.Infrastructure.Legacy;

/// <summary>
/// CẦU NỐI TẠM với hệ thống cũ: đọc (chỉ đọc) hồ sơ khách trong dbo.TCustomer để chuyển sang module Customers.
/// Xoá thư mục Legacy khi đã chuyển hết dữ liệu cũ.
/// </summary>
internal interface ILegacyCustomerReader
{
    Task<LegacyCustomerRow?> FindAsync(long legacyCustomerId, CancellationToken cancellationToken);
}

internal sealed class LegacyCustomerRow
{
    public long CustomerID { get; init; }
    public string? CustomerCode { get; init; }
    public string? CustomerName { get; init; }
    public string? ContactName { get; init; }
    public string? ContactEmail { get; init; }
    public string? Email { get; init; }
    public string? ContactPhone { get; init; }
    public string? Phone { get; init; }
    public string? Address1 { get; init; }
    public string? TaxCode { get; init; }
}

internal sealed class LegacyCustomerReader(CustomersDbContext db) : ILegacyCustomerReader
{
    public Task<LegacyCustomerRow?> FindAsync(long legacyCustomerId, CancellationToken cancellationToken) =>
        db.Database.SqlQueryRaw<LegacyCustomerRow>(
                """
                SELECT CustomerID, CustomerCode, CustomerName, ContactName, ContactEmail, Email,
                       ContactPhone, Phone, Address1, TaxCode
                FROM dbo.TCustomer WHERE CustomerID = @id
                """,
                new SqlParameter("@id", legacyCustomerId))
            .FirstOrDefaultAsync(cancellationToken);
}
