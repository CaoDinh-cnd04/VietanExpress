using System.Reflection;
using FluentValidation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using VietAnExpress.Customers.Application;
using VietAnExpress.Customers.Contracts;
using VietAnExpress.Customers.Infrastructure;
using VietAnExpress.SharedKernel.Authorization;
using VietAnExpress.SharedKernel.Persistence;

namespace VietAnExpress.Customers;

/// <summary>Điểm vào DUY NHẤT (public) của module Customers.</summary>
public static class CustomersModule
{
    public static Assembly Assembly => typeof(CustomersModule).Assembly;

    public static IServiceCollection AddCustomersModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddModuleDbContext<CustomersDbContext>(configuration, CustomersDbContext.Schema);
        services.AddScoped<ICustomerCodeGenerator, CustomerCodeGenerator>();
        services.AddScoped<ICustomersApi, CustomersApi>();
        services.AddScoped<Infrastructure.Legacy.ILegacyCustomerReader, Infrastructure.Legacy.LegacyCustomerReader>();
        services.AddSingleton<IPermissionProvider, CustomersPermissionProvider>();
        services.AddValidatorsFromAssembly(Assembly, includeInternalTypes: true);
        return services;
    }
}

internal sealed class CustomersPermissionProvider : IPermissionProvider
{
    public IEnumerable<PermissionDefinition> GetPermissions() =>
    [
        new(CustomersPermissions.View, "Xem danh sách, hồ sơ khách hàng", SystemRoles.Staff),
        new(CustomersPermissions.Manage, "Tạo, sửa, xoá khách hàng", SystemRoles.Staff)
    ];
}
