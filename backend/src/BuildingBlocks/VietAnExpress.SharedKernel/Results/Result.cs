using System.Diagnostics.CodeAnalysis;

namespace VietAnExpress.SharedKernel.Results;

public enum ErrorType
{
    Failure,
    Validation,
    NotFound,
    Conflict,
    Unauthorized,
    Forbidden,
    BusinessRule
}

/// <summary>Lỗi nghiệp vụ dự kiến trước. <see cref="Code"/> là mã máy đọc, <see cref="Message"/> tiếng Việt hiện cho người dùng.</summary>
public sealed record Error(string Code, string Message, ErrorType Type = ErrorType.Failure)
{
    public static readonly Error None = new(string.Empty, string.Empty);

    public static Error NotFound(string code, string message) => new(code, message, ErrorType.NotFound);
    public static Error Conflict(string code, string message) => new(code, message, ErrorType.Conflict);
    public static Error Validation(string code, string message) => new(code, message, ErrorType.Validation);
    public static Error Unauthorized(string code, string message) => new(code, message, ErrorType.Unauthorized);
    public static Error Forbidden(string code, string message) => new(code, message, ErrorType.Forbidden);
    public static Error BusinessRule(string code, string message) => new(code, message, ErrorType.BusinessRule);
}

/// <summary>
/// Kết quả của 1 command/query. Lỗi dự kiến (không tìm thấy, trùng mã…) trả qua Result;
/// exception chỉ dùng cho lỗi validation (pipeline) và vi phạm quy tắc domain.
/// </summary>
public class Result
{
    protected Result(bool isSuccess, Error error)
    {
        if (isSuccess != (error == Error.None))
            throw new ArgumentException("Result thành công không được có lỗi và ngược lại.", nameof(error));
        IsSuccess = isSuccess;
        Error = error;
    }

    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public Error Error { get; }

    public static Result Success() => new(true, Error.None);
    public static Result Failure(Error error) => new(false, error);
    public static Result<T> Success<T>(T value) => new(value, true, Error.None);
    public static Result<T> Failure<T>(Error error) => new(default, false, error);

    public static implicit operator Result(Error error) => Failure(error);
}

public sealed class Result<T> : Result
{
    private readonly T? _value;

    internal Result(T? value, bool isSuccess, Error error) : base(isSuccess, error) => _value = value;

    [NotNull]
    public T Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("Không đọc được giá trị của Result thất bại.");

    public static implicit operator Result<T>(T value) => Success(value);
    public static implicit operator Result<T>(Error error) => Failure<T>(error);
}
