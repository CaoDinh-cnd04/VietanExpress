using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.SharedKernel.Web;

/// <summary>
/// Controller gốc của mọi module. Controller chỉ nhận request → gửi command/query → đổi Result thành HTTP.
/// Không viết nghiệp vụ trong controller.
/// </summary>
[ApiController]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase
{
    private ISender? _sender;

    protected ISender Sender => _sender ??= HttpContext.RequestServices.GetRequiredService<ISender>();

    protected IActionResult OkData<T>(T data, string? message = null) => Ok(new ApiResponse<T>(data, message));

    protected IActionResult FromResult<T>(Result<T> result, string? successMessage = null) =>
        result.IsSuccess ? OkData(result.Value, successMessage) : Problem(result.Error);

    protected IActionResult FromResult(Result result, string successMessage) =>
        result.IsSuccess ? Ok(new ApiMessage(successMessage)) : Problem(result.Error);

    protected IActionResult FromPaged<T>(Result<PagedResult<T>> result)
    {
        if (result.IsFailure) return Problem(result.Error);
        var page = result.Value;
        return Ok(new ApiListResponse<T>(page.Items, page.TotalCount, page.Page, page.PageSize, page.TotalPages));
    }

    protected IActionResult Problem(Error error)
    {
        var problem = ProblemDetailsMapper.FromError(HttpContext, error);
        return new ObjectResult(problem)
        {
            StatusCode = problem.Status,
            ContentTypes = { "application/problem+json" }
        };
    }
}
