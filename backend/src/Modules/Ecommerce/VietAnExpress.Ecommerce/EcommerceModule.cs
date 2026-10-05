using System.Reflection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using VietAnExpress.Ecommerce.Infrastructure;
using VietAnExpress.SharedKernel.Persistence;

namespace VietAnExpress.Ecommerce;

/// <summary>Điểm vào DUY NHẤT (public) của module Ecommerce — kết nối shop trên các kênh bán (Shopify, sau này TikTok Shop, Amazon…).</summary>
public static class EcommerceModule
{
    public static Assembly Assembly => typeof(EcommerceModule).Assembly;

    public static IServiceCollection AddEcommerceModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddModuleDbContext<EcommerceDbContext>(configuration, EcommerceDbContext.Schema);
        services.AddOptions<Infrastructure.Shopify.ShopifyOptions>()
            .Bind(configuration.GetSection(Infrastructure.Shopify.ShopifyOptions.Section))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.Configure<Infrastructure.Shopify.EcommerceOptions>(configuration.GetSection(Infrastructure.Shopify.EcommerceOptions.Section));
        return services;
    }
}
