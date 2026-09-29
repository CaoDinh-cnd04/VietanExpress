using Microsoft.AspNetCore.Diagnostics;
using VietAnExpress.SharedKernel.Exceptions;
using VietAnExpress.SharedKernel.Web;

namespace VietAnExpress.API.Infrastructure;

/// <summary>
/// Bắt mọi exception chưa xử lý → trả ProblemDetails thống nhất (có "error" + "message" cho frontend).
/// Lỗi nghiệp vụ ghi log mức Warning, lỗi hệ thống ghi Error kèm stack trace (không trả stack trace ra ngoài).
/// </summary>
internal sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception exception, CancellationToken cancellationToken)
    {
        var problem = ProblemDetailsMapper.FromException(http, exception);

        if (exception is AppException or OperationCanceledException)
            logger.LogWarning("{Method} {Path} → {Status}: {Message}", http.Request.Method, http.Request.Path, problem.Status, exception.Message);
        else
            logger.LogError(exception, "Lỗi chưa xử lý tại {Method} {Path}", http.Request.Method, http.Request.Path);

        http.Response.StatusCode = problem.Status ?? StatusCodes.Status500InternalServerError;
        await http.Response.WriteAsJsonAsync(problem, (System.Text.Json.JsonSerializerOptions?)null, "application/problem+json", cancellationToken);
        return true;
    }
}
