using System.Globalization;
using VietAnExpress.SharedKernel.Persistence;

namespace VietAnExpress.Customers.Infrastructure;

internal interface ICustomerCodeGenerator
{
    Task<string> NextAsync(CancellationToken cancellationToken);
}

/// <summary>Sinh mã khách KH000001, KH000002… từ SQL Sequence — an toàn khi nhiều request tạo cùng lúc.</summary>
internal sealed class CustomerCodeGenerator(CustomersDbContext db) : ICustomerCodeGenerator
{
    public const string SequenceName = "CustomerCodeSequence";

    public async Task<string> NextAsync(CancellationToken cancellationToken)
    {
        var next = await db.Database.NextSequenceValueAsync(CustomersDbContext.Schema, SequenceName, cancellationToken);
        return "KH" + next.ToString("D6", CultureInfo.InvariantCulture);
    }
}
