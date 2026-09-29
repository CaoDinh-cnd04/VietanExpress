using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Asp.Versioning;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.RateLimiting;
using Serilog;
using VietAnExpress.API.Infrastructure;
using VietAnExpress.Customers;
using VietAnExpress.Identity;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Authorization;
using VietAnExpress.SharedKernel.Persistence;
using VietAnExpress.SharedKernel.Web;
using VietAnExpress.Shipments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;

Log.Logger = new LoggerConfiguration().WriteTo.Console().CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Render / Docker: nền tảng cấp cổng qua biến PORT và tự lo HTTPS ở proxy phía trước.
    var platformPort = Environment.GetEnvironmentVariable("PORT");
    if (!string.IsNullOrEmpty(platformPort)) builder.WebHost.UseUrls($"http://0.0.0.0:{platformPort}");

    // Sau proxy (Vercel → Render): lấy IP thật của khách (giới hạn đăng nhập theo IP) và scheme https (cookie Secure).
    builder.Services.Configure<ForwardedHeadersOptions>(o =>
    {
        o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        o.KnownIPNetworks.Clear(); // proxy của nền tảng không có IP cố định
        o.KnownProxies.Clear();
        o.ForwardLimit = 2;        // Vercel + Render
    });

    builder.Host.UseSerilog((context, services, logger) =>
    {
        logger.ReadFrom.Configuration(context.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext();
        // Máy dev: ghi thêm file logs/. Trên Render / Docker chỉ ghi console (nền tảng tự thu log, ổ đĩa container không bền).
        if (context.HostingEnvironment.IsDevelopment())
            logger.WriteTo.File("logs/vietan-.log", rollingInterval: RollingInterval.Day, retainedFileCountLimit: 30);
    });

    // ---------- Module ----------
    // Thêm module mới: 1 dòng AddXxxModule + thêm assembly vào mảng dưới.
    Assembly[] moduleAssemblies = [IdentityModule.Assembly, CustomersModule.Assembly, ShipmentsModule.Assembly];

    builder.Services
        .AddIdentityModule(builder.Configuration)
        .AddCustomersModule(builder.Configuration)
        .AddShipmentsModule(builder.Configuration);

    // ---------- Dùng chung ----------
    builder.Services.AddSingleton(TimeProvider.System);
    builder.Services.AddHttpContextAccessor();
    builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
    builder.Services.AddScoped<AuditableEntityInterceptor>();
    builder.Services.AddScoped<DomainEventsInterceptor>();

    builder.Services.AddMediatR(cfg =>
    {
        cfg.RegisterServicesFromAssemblies(moduleAssemblies);
        cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
        cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
    });

    // ---------- Phân quyền theo permission ----------
    builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
    builder.Services.AddAuthorization();

    // ---------- Web API ----------
    builder.Services
        .AddControllers()
        .ConfigureApplicationPartManager(parts =>
        {
            foreach (var assembly in moduleAssemblies)
                parts.ApplicationParts.Add(new Microsoft.AspNetCore.Mvc.ApplicationParts.AssemblyPart(assembly));
            // Controller của module là internal → thay provider mặc định (chỉ nhận public).
            var defaultProvider = parts.FeatureProviders.OfType<ControllerFeatureProvider>().FirstOrDefault();
            if (defaultProvider is not null) parts.FeatureProviders.Remove(defaultProvider);
            parts.FeatureProviders.Add(new InternalControllerFeatureProvider());
        })
        .AddJsonOptions(o =>
        {
            o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
            o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
        })
        .ConfigureApiBehaviorOptions(o =>
        {
            // Lỗi đọc body (JSON sai kiểu…) cũng trả cùng định dạng ProblemDetails có "error" + "message".
            o.InvalidModelStateResponseFactory = context =>
            {
                var errors = context.ModelState
                    .Where(e => e.Value?.Errors.Count > 0)
                    .ToDictionary(e => e.Key, e => e.Value!.Errors.Select(x => string.IsNullOrEmpty(x.ErrorMessage) ? "Giá trị không hợp lệ" : x.ErrorMessage).ToArray());
                var problem = ProblemDetailsMapper.Create(context.HttpContext, StatusCodes.Status400BadRequest, "INVALID_REQUEST",
                    errors.Values.SelectMany(v => v).FirstOrDefault() ?? "Dữ liệu gửi lên không hợp lệ");
                problem.Extensions["errors"] = errors;
                return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(problem) { ContentTypes = { "application/problem+json" } };
            };
        });

    builder.Services
        .AddApiVersioning(o =>
        {
            o.DefaultApiVersion = new ApiVersion(1);
            o.AssumeDefaultVersionWhenUnspecified = true;
            o.ReportApiVersions = true;
            o.ApiVersionReader = new UrlSegmentApiVersionReader();
        })
        .AddMvc()
        .AddApiExplorer(o =>
        {
            o.GroupNameFormat = "'v'VVV";
            o.SubstituteApiVersionInUrl = true;
        });

    builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
    builder.Services.AddProblemDetails();

    builder.Services.AddRateLimiter(o =>
    {
        o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        o.OnRejected = async (context, ct) =>
        {
            var problem = ProblemDetailsMapper.Create(context.HttpContext, StatusCodes.Status429TooManyRequests,
                "TOO_MANY_REQUESTS", "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút");
            await context.HttpContext.Response.WriteAsJsonAsync(problem, (JsonSerializerOptions?)null, "application/problem+json", ct);
        };
        o.AddPolicy(RateLimitPolicies.Login, http => FixedWindowByIp(http, permitLimit: 10));
        o.AddPolicy(RateLimitPolicies.PublicTracking, http => FixedWindowByIp(http, permitLimit: 30));
    });

    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();
    builder.Services.ConfigureOptions<ConfigureSwaggerOptions>();

    var app = builder.Build();

    // ---------- Pipeline HTTP ----------
    app.UseForwardedHeaders();
    app.UseExceptionHandler();
    app.UseSerilogRequestLogging();

    if (app.Configuration.GetValue("Swagger:Enabled", app.Environment.IsDevelopment()))
    {
        app.UseSwagger();
        app.UseSwaggerUI(o =>
        {
            foreach (var description in app.DescribeApiVersions())
                o.SwaggerEndpoint($"/swagger/{description.GroupName}/swagger.json", $"Việt An Express API {description.GroupName}");
            o.DocumentTitle = "Việt An Express API";
        });
    }

    if (!app.Environment.IsDevelopment())
    {
        app.UseHsts();
        // Chạy sau proxy của nền tảng (có PORT) thì proxy đã ép HTTPS; tự chuyển hướng sẽ làm hỏng health check nội bộ.
        if (string.IsNullOrEmpty(platformPort)) app.UseHttpsRedirection();
    }

    app.UseCors();
    app.UseAuthentication();
    app.UseRateLimiter();
    app.UseAuthorization();

    app.MapControllers();
    app.MapHealthChecks("/health").AllowAnonymous();

    // Migrate + seed khi khởi động. Tắt bằng Database:RunStartupTasks=false (vd kiểm tra container không có DB trong CI).
    if (app.Configuration.GetValue("Database:RunStartupTasks", true))
        await RunStartupTasksAsync(app.Services, app.Lifetime.ApplicationStopping);
    await app.RunAsync();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Ứng dụng dừng do lỗi khi khởi động");
    throw;
}
finally
{
    await Log.CloseAndFlushAsync();
}

// Giới hạn theo IP trong cửa sổ 1 phút.
static RateLimitPartition<string> FixedWindowByIp(HttpContext http, int permitLimit) =>
    RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = permitLimit, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 });

// Migrate (nếu bật) rồi seed — chạy theo thứ tự Order của từng module.
static async Task RunStartupTasksAsync(IServiceProvider services, CancellationToken ct)
{
    await using var scope = services.CreateAsyncScope();
    foreach (var task in scope.ServiceProvider.GetServices<IModuleStartupTask>().OrderBy(t => t.Order))
        await task.RunAsync(ct);
}

/// <summary>Cho test tích hợp (WebApplicationFactory) truy cập.</summary>
public partial class Program;
