using Microsoft.EntityFrameworkCore;
using VietAnExpress.Shipments.Infrastructure;
using Xunit;

namespace VietAnExpress.Shipments.Tests;

/// <summary>
/// Test truy vấn chạy trên SQL Server thật (EF InMemory không hỗ trợ complex type Address / Money khi truy vấn).
/// Tạo database tạm vietan_tests_xxx, xoá khi xong. Bật bằng biến môi trường, vd:
///   $env:VIETAN_TEST_SQLSERVER = "LAPTOP-K91T0OHE\SQLEXPRESS01"          (Windows Authentication)
///   VIETAN_TEST_SQLSERVER="Server=localhost;User Id=sa;Password=...;"     (connection string đầy đủ — dùng trong CI)
/// Không đặt biến → các test này được bỏ qua (skip), không báo lỗi.
/// </summary>
public sealed class SqlServerFixture : IAsyncLifetime
{
    public static readonly string? Server = Environment.GetEnvironmentVariable("VIETAN_TEST_SQLSERVER");

    private readonly string _connectionString = BuildConnectionString(Server, $"vietan_tests_{Guid.NewGuid():N}");

    /// <summary>Chỉ có tên server → Windows Authentication; có dấu "=" → coi là connection string, thay Database.</summary>
    private static string BuildConnectionString(string? server, string database)
    {
        if (server is null) return "";
        if (!server.Contains('=')) return $"Server={server};Database={database};Trusted_Connection=True;TrustServerCertificate=True";
        var builder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(server) { InitialCatalog = database, TrustServerCertificate = true };
        return builder.ConnectionString;
    }

    internal ShipmentsDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<ShipmentsDbContext>().UseSqlServer(_connectionString).Options);

    public async ValueTask InitializeAsync()
    {
        if (Server is null) return;
        await using var db = CreateDb();
        await db.Database.EnsureCreatedAsync();
    }

    public async ValueTask DisposeAsync()
    {
        if (Server is null) return;
        await using var db = CreateDb();
        await db.Database.EnsureDeletedAsync();
    }

    public static void SkipIfUnavailable() =>
        Assert.SkipWhen(Server is null, "Chưa đặt VIETAN_TEST_SQLSERVER — bỏ qua test cần SQL Server");
}

[CollectionDefinition(Name)]
public sealed class SqlServerCollection : ICollectionFixture<SqlServerFixture>
{
    public const string Name = "sql-server";
}
