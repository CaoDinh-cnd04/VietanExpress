using System.Reflection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using VietAnExpress.Ecommerce.Contracts;
using VietAnExpress.Ecommerce.Infrastructure;
using VietAnExpress.Ecommerce.Infrastructure.Shopify;
using VietAnExpress.SharedKernel.Authorization;
using VietAnExpress.SharedKernel.Persistence;

namespace VietAnExpress.Ecommerce;

/// <summary>Điểm vào DUY NHẤT (public) của module Ecommerce — kết nối shop trên các kênh bán (Shopify, sau này TikTok Shop, Amazon…).</summary>
public static class EcommerceModule
{
    public static Assembly Assembly => typeof(EcommerceModule).Assembly;

    public static IServiceCollection AddEcommerceModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddModuleDbContext<EcommerceDbContext>(configuration, EcommerceDbContext.Schema);
        services.AddOptions<ShopifyOptions>()
            .Bind(configuration.GetSection(ShopifyOptions.Section))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.Configure<EcommerceOptions>(configuration.GetSection(EcommerceOptions.Section));

        services.AddSingleton<TokenProtector>();
        services.AddSingleton<PortalHosts>();
        services.AddHttpClient<ShopifyClient>(c =>
        {
            c.Timeout = TimeSpan.FromSeconds(15);
            c.DefaultRequestHeaders.UserAgent.ParseAdd("VietAnExpress-Portal/1.0");
        });
        services.AddSingleton<IPermissionProvider, EcommercePermissionProvider>();
        return services;
    }
}

internal sealed class EcommercePermissionProvider : IPermissionProvider
{
    private const string Customer = SystemRoles.Customer;

    public IEnumerable<PermissionDefinition> GetPermissions() =>
    [
        new(EcommercePermissions.View, "Xem cửa hàng đã kết nối", Customer),
        new(EcommercePermissions.Connect, "Kết nối / ngắt kết nối cửa hàng", Customer)
    ];
}
