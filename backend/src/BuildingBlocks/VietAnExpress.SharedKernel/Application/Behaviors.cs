using System.Diagnostics;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;
using ValidationException = VietAnExpress.SharedKernel.Exceptions.ValidationException;

namespace VietAnExpress.SharedKernel.Application;

/// <summary>Chạy mọi validator của request trước handler; có lỗi thì ném ValidationException (→ HTTP 400).</summary>
public sealed class ValidationBehavior<TRequest, TResponse>(IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (!validators.Any()) return await next(cancellationToken);

        var context = new ValidationContext<TRequest>(request);
        var results = await Task.WhenAll(validators.Select(v => v.ValidateAsync(context, cancellationToken)));
        var errors = results
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .GroupBy(f => ToCamelCase(f.PropertyName), f => f.ErrorMessage)
            .ToDictionary(g => g.Key, g => g.Distinct().ToArray());

        if (errors.Count > 0) throw new ValidationException(errors);
        return await next(cancellationToken);
    }

    private static string ToCamelCase(string name) =>
        string.IsNullOrEmpty(name) ? name : string.Join('.', name.Split('.').Select(p => p.Length == 0 ? p : char.ToLowerInvariant(p[0]) + p[1..]));
}

/// <summary>Ghi log thời gian xử lý từng command/query; cảnh báo khi chậm.</summary>
public sealed class LoggingBehavior<TRequest, TResponse>(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private const int SlowThresholdMs = 500;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var name = typeof(TRequest).Name;
        var sw = Stopwatch.StartNew();
        var response = await next(cancellationToken);
        sw.Stop();

        if (sw.ElapsedMilliseconds > SlowThresholdMs)
            logger.LogWarning("{Request} chạy chậm: {ElapsedMs} ms", name, sw.ElapsedMilliseconds);
        else
            logger.LogDebug("{Request} xong trong {ElapsedMs} ms", name, sw.ElapsedMilliseconds);

        return response;
    }
}
