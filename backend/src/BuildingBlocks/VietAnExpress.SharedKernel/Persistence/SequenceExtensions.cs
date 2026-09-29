using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

namespace VietAnExpress.SharedKernel.Persistence;

public static class SequenceExtensions
{
    /// <summary>
    /// Lấy số kế tiếp của SQL Server Sequence (an toàn khi nhiều request cùng lúc).
    /// Gọi thẳng ADO.NET vì SqlQueryRaw bọc câu lệnh vào subquery — SQL Server không cho NEXT VALUE FOR trong subquery.
    /// </summary>
    public static async Task<long> NextSequenceValueAsync(
        this DatabaseFacade database, string schema, string sequence, CancellationToken cancellationToken)
    {
        await database.OpenConnectionAsync(cancellationToken);
        try
        {
            await using var command = database.GetDbConnection().CreateCommand();
            command.CommandText = $"SELECT NEXT VALUE FOR [{schema}].[{sequence}]";
            command.Transaction = database.CurrentTransaction?.GetDbTransaction();
            var value = await command.ExecuteScalarAsync(cancellationToken);
            return Convert.ToInt64(value, CultureInfo.InvariantCulture);
        }
        finally
        {
            await database.CloseConnectionAsync();
        }
    }
}
