using Asp.Versioning.ApiExplorer;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace VietAnExpress.API.Infrastructure;

/// <summary>Mỗi phiên bản API (v1, v2…) có 1 tài liệu Swagger riêng; hỗ trợ nhập JWT để thử endpoint cần đăng nhập.</summary>
internal sealed class ConfigureSwaggerOptions(IApiVersionDescriptionProvider versions) : IConfigureOptions<SwaggerGenOptions>
{
    public void Configure(SwaggerGenOptions options)
    {
        foreach (var description in versions.ApiVersionDescriptions)
        {
            options.SwaggerDoc(description.GroupName, new OpenApiInfo
            {
                Title = "Việt An Express API",
                Version = description.ApiVersion.ToString(),
                Description = description.IsDeprecated
                    ? "Phiên bản này đã ngừng hỗ trợ, vui lòng chuyển sang phiên bản mới."
                    : "API cho portal khách hàng và hệ thống nội bộ Việt An Express."
            });
        }

        options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Dán access token (lấy từ POST /api/v1/auth/login?useCookies=false)."
        });
        options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference("Bearer", document)] = []
        });

        // Tên schema theo tên đầy đủ để tránh trùng giữa các module (vd 2 module cùng có AddressDto).
        options.CustomSchemaIds(SchemaId);
    }

    /// <summary>Shipments.Application.Dtos.AddressDto; ApiResponse&lt;T&gt; → ApiResponseOf[T].</summary>
    private static string SchemaId(Type type)
    {
        var name = type.IsGenericType ? type.Name[..type.Name.IndexOf('`')] : type.Name;
        var ns = type.Namespace?.Replace("VietAnExpress.", string.Empty);
        var baseName = type.Namespace?.StartsWith("VietAnExpress", StringComparison.Ordinal) == true ? $"{ns}.{name}" : name;
        return type.IsGenericType
            ? $"{baseName}Of[{string.Join(",", type.GetGenericArguments().Select(SchemaId))}]"
            : baseName;
    }
}
