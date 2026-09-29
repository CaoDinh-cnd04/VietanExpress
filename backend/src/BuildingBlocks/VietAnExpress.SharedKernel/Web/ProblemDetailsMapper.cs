using System.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.SharedKernel.Exceptions;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.SharedKernel.Web;

/// <summary>
/// Nơi DUY NHẤT dựng ProblemDetails cho lỗi — dùng chung cho controller (Result lỗi) và middleware (exception).
/// Ngoài chuẩn RFC 9457, thêm 2 trường mà frontend đang đọc: <c>error</c> (mã lỗi) và <c>message</c> (câu tiếng Việt).
/// </summary>
public static class ProblemDetailsMapper
{
    public static int StatusCodeOf(ErrorType type) => type switch
    {
        ErrorType.Validation => StatusCodes.Status400BadRequest,
        ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
        ErrorType.Forbidden => StatusCodes.Status403Forbidden,
        ErrorType.NotFound => StatusCodes.Status404NotFound,
        ErrorType.Conflict => StatusCodes.Status409Conflict,
        ErrorType.BusinessRule => StatusCodes.Status422UnprocessableEntity,
        _ => StatusCodes.Status500InternalServerError
    };

    public static ProblemDetails FromError(HttpContext http, Error error) =>
        Create(http, StatusCodeOf(error.Type), error.Code, error.Message);

    /// <summary>Exception → ProblemDetails. Exception lạ trả 500 với câu chung, không lộ chi tiết.</summary>
    public static ProblemDetails FromException(HttpContext http, Exception exception) => exception switch
    {
        ValidationException v => WithErrors(Create(http, StatusCodes.Status400BadRequest, v.Code, v.Message), v.Errors),
        NotFoundException e => Create(http, StatusCodes.Status404NotFound, e.Code, e.Message),
        ConflictException e => Create(http, StatusCodes.Status409Conflict, e.Code, e.Message),
        ForbiddenException e => Create(http, StatusCodes.Status403Forbidden, e.Code, e.Message),
        DomainException e => Create(http, StatusCodes.Status422UnprocessableEntity, e.Code, e.Message),
        DbUpdateConcurrencyException => Create(http, StatusCodes.Status409Conflict, "CONCURRENCY_CONFLICT", "Dữ liệu vừa được người khác thay đổi, vui lòng tải lại rồi thử lại"),
        OperationCanceledException => Create(http, 499, "REQUEST_CANCELLED", "Yêu cầu đã bị huỷ"),
        _ => Create(http, StatusCodes.Status500InternalServerError, "INTERNAL_ERROR", "Có lỗi hệ thống, vui lòng thử lại sau")
    };

    public static ProblemDetails Create(HttpContext http, int status, string code, string message)
    {
        var problem = new ProblemDetails
        {
            Status = status,
            Title = ReasonPhrases.Get(status),
            Detail = message,
            Instance = http.Request.Path,
            Type = $"https://httpstatuses.io/{status}"
        };
        problem.Extensions["error"] = code;
        problem.Extensions["message"] = message;
        problem.Extensions["traceId"] = Activity.Current?.Id ?? http.TraceIdentifier;
        return problem;
    }

    private static ProblemDetails WithErrors(ProblemDetails problem, IReadOnlyDictionary<string, string[]> errors)
    {
        problem.Extensions["errors"] = errors;
        return problem;
    }

    private static class ReasonPhrases
    {
        public static string Get(int status) => status switch
        {
            400 => "Dữ liệu không hợp lệ",
            401 => "Chưa đăng nhập",
            403 => "Không có quyền",
            404 => "Không tìm thấy",
            409 => "Xung đột dữ liệu",
            422 => "Vi phạm quy tắc nghiệp vụ",
            429 => "Gửi yêu cầu quá nhiều",
            499 => "Yêu cầu đã huỷ",
            _ => "Lỗi hệ thống"
        };
    }
}
