using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace VietAnExpress.SharedKernel.Persistence;

/// <summary>Việc chạy 1 lần khi khởi động (migrate, seed). Chạy theo <see cref="Order"/> tăng dần.</summary>
public interface IModuleStartupTask
{
    int Order { get; }
    Task RunAsync(CancellationToken cancellationToken);
}

public static class ModuleDatabase
{
    public const string ConnectionStringName = "Default";
    public const string MigrationsHistoryTable = "__EFMigrationsHistory";

    /// <summary>
    /// Đăng ký DbContext của 1 module: SQL Server, schema riêng cho bảng lịch sử migration,
    /// interceptor audit + domain event, health check, và task migrate khi khởi động (nếu bật).
    /// </summary>
    public static IServiceCollection AddModuleDbContext<TContext>(
        this IServiceCollection services, IConfiguration configuration, string schema)
        where TContext : DbContext
    {
        var connectionString = configuration.GetConnectionString(ConnectionStringName);

        services.AddDbContext<TContext>((sp, options) =>
        {
            options.UseSqlServer(
                connectionString ?? throw MissingConnectionString(),
                sql =>
                {
                    sql.MigrationsHistoryTable(MigrationsHistoryTable, schema);
                    sql.EnableRetryOnFailure(maxRetryCount: 3);
                });
            options.AddInterceptors(
                sp.GetRequiredService<AuditableEntityInterceptor>(),
                sp.GetRequiredService<DomainEventsInterceptor>());
        });

        services.AddHealthChecks().AddDbContextCheck<TContext>($"db-{schema}");
        services.AddScoped<IModuleStartupTask, MigrateDbContextTask<TContext>>();
        return services;
    }

    /// <summary>
    /// DbContext chỉ đọc / ghi bảng có sẵn của hệ thống cũ (dbo.*): KHÔNG migration, không tạo bảng lịch sử,
    /// không tạo bảng mới. Mọi entity phải map bằng ToTable(..., t => t.ExcludeFromMigrations()).
    /// </summary>
    public static IServiceCollection AddLegacyDbContext<TContext>(this IServiceCollection services, IConfiguration configuration, string name)
        where TContext : DbContext
    {
        var connectionString = configuration.GetConnectionString(ConnectionStringName);
        services.AddDbContext<TContext>(options => options.UseSqlServer(
            connectionString ?? throw MissingConnectionString(),
            sql => sql.EnableRetryOnFailure(maxRetryCount: 3)));
        services.AddHealthChecks().AddDbContextCheck<TContext>($"db-{name}");
        return services;
    }

    private static InvalidOperationException MissingConnectionString() => new(
        $"Thiếu ConnectionStrings:{ConnectionStringName}. Khi dev: dotnet user-secrets set \"ConnectionStrings:{ConnectionStringName}\" \"...\" " +
        $"trong src/VietAnExpress.API; khi deploy: biến môi trường ConnectionStrings__{ConnectionStringName}.");
}

/// <summary>Áp migration còn thiếu của 1 module khi khởi động — chỉ khi Database:MigrateOnStartup = true.</summary>
internal sealed class MigrateDbContextTask<TContext>(
    TContext context, IConfiguration configuration, ILogger<MigrateDbContextTask<TContext>> logger) : IModuleStartupTask
    where TContext : DbContext
{
    public int Order => 0;

    public async Task RunAsync(CancellationToken cancellationToken)
    {
        if (!configuration.GetValue<bool>("Database:MigrateOnStartup")) return;

        var pending = (await context.Database.GetPendingMigrationsAsync(cancellationToken)).ToList();
        if (pending.Count == 0) return;

        logger.LogInformation("Áp {Count} migration cho {Context}: {Migrations}", pending.Count, typeof(TContext).Name, pending);
        await context.Database.MigrateAsync(cancellationToken);
    }
}
