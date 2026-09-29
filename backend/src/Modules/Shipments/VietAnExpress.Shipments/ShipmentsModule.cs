using System.Reflection;
using FluentValidation;
using Mapster;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using VietAnExpress.SharedKernel.Authorization;
using VietAnExpress.SharedKernel.Persistence;
using VietAnExpress.Shipments.Contracts;
using VietAnExpress.Shipments.Infrastructure;

namespace VietAnExpress.Shipments;

/// <summary>Điểm vào DUY NHẤT (public) của module Shipments.</summary>
public static class ShipmentsModule
{
    public static Assembly Assembly => typeof(ShipmentsModule).Assembly;

    public static IServiceCollection AddShipmentsModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddModuleDbContext<ShipmentsDbContext>(configuration, ShipmentsDbContext.Schema);
        services.AddScoped<IShipmentCodeGenerator, ShipmentCodeGenerator>();
        services.AddScoped<Infrastructure.Legacy.ILegacyBillReader, Infrastructure.Legacy.LegacyBillReader>();
        services.AddScoped<ILegacyOrderNumberAllocator, LegacyOrderNumberAllocator>();
        services.AddScoped<Application.Orders.OrderAccess>();
        services.Configure<Application.Orders.Documents.CompanyInfo>(configuration.GetSection(Application.Orders.Documents.CompanyInfo.Section));
        services.AddSingleton<IPermissionProvider, ShipmentsPermissionProvider>();
        services.AddValidatorsFromAssembly(Assembly, includeInternalTypes: true);
        TypeAdapterConfig.GlobalSettings.Scan(Assembly);
        return services;
    }
}

internal sealed class ShipmentsPermissionProvider : IPermissionProvider
{
    private const string Staff = SystemRoles.Staff;
    private const string Customer = SystemRoles.Customer;

    public IEnumerable<PermissionDefinition> GetPermissions() =>
    [
        new(ShipmentsPermissions.View, "Xem vận đơn", Staff, Customer),
        new(ShipmentsPermissions.Create, "Tạo đơn nháp", Staff, Customer),
        new(ShipmentsPermissions.Update, "Sửa đơn nháp", Staff, Customer),
        new(ShipmentsPermissions.IssueBill, "In & cấp mã vận đơn", Staff, Customer),
        new(ShipmentsPermissions.Cancel, "Huỷ vận đơn chưa đi", Staff, Customer),
        new(ShipmentsPermissions.Operate, "Xuất hàng, cập nhật hành trình, xác nhận giao", Staff)
    ];
}
