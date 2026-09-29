using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using VietAnExpress.Identity.Application.Commands;
using VietAnExpress.Identity.Application.Dtos;
using VietAnExpress.Identity.Application.Queries;
using VietAnExpress.Identity.Contracts;
using VietAnExpress.SharedKernel.Authorization;
using VietAnExpress.SharedKernel.Web;

namespace VietAnExpress.Identity.Api;

[ApiVersion(1)]
[Route("api/v{version:apiVersion}/users")]
[Tags("Quản trị tài khoản")]
internal sealed class UsersController : ApiControllerBase
{
    [HttpGet]
    [HasPermission(IdentityPermissions.UsersView)]
    [ProducesResponseType<ApiListResponse<UserDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] string? search, [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken ct) =>
        FromPaged(await Sender.Send(new GetUsersQuery(search, page, pageSize), ct));

    [HttpPost]
    [HasPermission(IdentityPermissions.UsersManage)]
    [ProducesResponseType<ApiResponse<UserDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Create(CreateUserCommand command, CancellationToken ct) =>
        FromResult(await Sender.Send(command, ct), "Đã tạo tài khoản");

    /// <summary>Khoá / mở khoá tài khoản. Khoá thì mọi phiên đăng nhập bị thu hồi.</summary>
    [HttpPut("{id:guid}/active")]
    [HasPermission(IdentityPermissions.UsersManage)]
    [ProducesResponseType<ApiMessage>(StatusCodes.Status200OK)]
    public async Task<IActionResult> SetActive(Guid id, SetActiveRequest body, CancellationToken ct) =>
        FromResult(await Sender.Send(new SetUserActiveCommand(id, body.IsActive), ct),
            body.IsActive ? "Đã mở khoá tài khoản" : "Đã khoá tài khoản");
}

internal sealed record SetActiveRequest(bool IsActive);
