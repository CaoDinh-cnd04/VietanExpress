namespace VietAnExpress.SharedKernel.Exceptions;

/// <summary>Exception có mã lỗi + câu thông báo tiếng Việt, được middleware đổi thành ProblemDetails.</summary>
public abstract class AppException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

/// <summary>Vi phạm quy tắc nghiệp vụ trong domain (vd giao đơn đã huỷ) → HTTP 422.</summary>
public sealed class DomainException(string code, string message) : AppException(code, message);

/// <summary>Dữ liệu đầu vào không hợp lệ (FluentValidation) → HTTP 400.</summary>
public sealed class ValidationException(IReadOnlyDictionary<string, string[]> errors)
    : AppException("VALIDATION_FAILED", errors.Values.SelectMany(e => e).FirstOrDefault() ?? "Dữ liệu không hợp lệ")
{
    public IReadOnlyDictionary<string, string[]> Errors { get; } = errors;
}

/// <summary>Không tìm thấy tài nguyên → HTTP 404.</summary>
public sealed class NotFoundException(string code, string message) : AppException(code, message);

/// <summary>Xung đột dữ liệu (trùng mã, sửa đồng thời) → HTTP 409.</summary>
public sealed class ConflictException(string code, string message) : AppException(code, message);

/// <summary>Không đủ quyền trên tài nguyên cụ thể → HTTP 403.</summary>
public sealed class ForbiddenException(string code, string message) : AppException(code, message);
