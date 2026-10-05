using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace VietAnExpress.Ecommerce.Infrastructure;

/// <summary>
/// Domain portal hợp lệ để ghép URL callback OAuth và đưa khách về sau khi ủy quyền:
/// host của Company:PortalUrl và Cors:AllowedOrigins (khi dev: thêm localhost). Proxy Vercel gửi domain thật qua X-Forwarded-Host;
/// header này khách tự đặt được khi gọi thẳng backend nên chỉ nhận host nằm trong danh sách.
/// </summary>
internal sealed class PortalHosts
{
    private readonly string _default;
    private readonly HashSet<string> _allowed;
    private readonly bool _allowLocalhost;

    public PortalHosts(IConfiguration configuration, IHostEnvironment environment)
    {
        var urls = new[] { configuration["Company:PortalUrl"] ?? "" }
            .Concat(configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? []);
        var hosts = urls.Select(u => Uri.TryCreate(u, UriKind.Absolute, out var uri) ? uri.Authority.ToLowerInvariant() : null).OfType<string>().ToList();
        _default = hosts.FirstOrDefault() ?? "localhost:5173";
        _allowed = [.. hosts];
        _allowLocalhost = environment.IsDevelopment();
    }

    /// <summary>Host khách đang dùng nếu hợp lệ, không thì domain mặc định (Company:PortalUrl).</summary>
    public string Resolve(string? forwardedHost, string? host)
    {
        var candidate = (forwardedHost ?? host)?.Split(',')[0].Trim().ToLowerInvariant();
        return candidate is not null && IsAllowed(candidate) ? candidate : _default;
    }

    public bool IsAllowed(string host) => _allowed.Contains(host) || (_allowLocalhost && IsLocal(host));

    /// <summary>URL tuyệt đối trên portal — http cho localhost khi dev, còn lại https.</summary>
    public static string Url(string host, string pathAndQuery) => $"{(IsLocal(host) ? "http" : "https")}://{host}{pathAndQuery}";

    private static bool IsLocal(string host) => host.StartsWith("localhost", StringComparison.Ordinal) || host.StartsWith("127.0.0.1", StringComparison.Ordinal);
}
