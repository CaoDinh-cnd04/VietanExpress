using Asp.Versioning;
using Mapster;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using VietAnExpress.Customers.Application.Commands;
using VietAnExpress.Customers.Application.Dtos;
using VietAnExpress.Customers.Application.Queries;
using VietAnExpress.Customers.Contracts;
using VietAnExpress.SharedKernel.Authorization;
using VietAnExpress.SharedKernel.Web;

namespace VietAnExpress.Customers.Api;

[ApiVersion(1)]
[Route("api/v{version:apiVersion}/customers")]
[Tags("Khách hàng")]
internal sealed class CustomersController : ApiControllerBase
{
    /// <summary>Danh sách khách hàng (phân trang, tìm kiếm).</summary>
    [HttpGet]
    [HasPermission(CustomersPermissions.View)]
    [ProducesResponseType<ApiListResponse<CustomerDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? search, [FromQuery] bool? isActive, [FromQuery] int? page, [FromQuery] int? pageSize,
        CancellationToken ct) =>
        FromPaged(await Sender.Send(new GetCustomersQuery(search, isActive, page, pageSize), ct));

    [HttpGet("{id:guid}")]
    [HasPermission(CustomersPermissions.View)]
    [ProducesResponseType<ApiResponse<CustomerDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) =>
        FromResult(await Sender.Send(new GetCustomerByIdQuery(id), ct));

    [HttpPost]
    [HasPermission(CustomersPermissions.Manage)]
    [ProducesResponseType<ApiResponse<CustomerDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Create(CreateCustomerCommand command, CancellationToken ct) =>
        FromResult(await Sender.Send(command, ct), "Đã tạo khách hàng");

    [HttpPut("{id:guid}")]
    [HasPermission(CustomersPermissions.Manage)]
    [ProducesResponseType<ApiResponse<CustomerDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid id, UpdateCustomerRequest request, CancellationToken ct) =>
        FromResult(await Sender.Send(request.Adapt<UpdateCustomerCommand>() with { Id = id }, ct), "Đã cập nhật khách hàng");

    [HttpDelete("{id:guid}")]
    [HasPermission(CustomersPermissions.Manage)]
    [ProducesResponseType<ApiMessage>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) =>
        FromResult(await Sender.Send(new DeleteCustomerCommand(id), ct), "Đã xoá khách hàng");
}

internal sealed record UpdateCustomerRequest(
    string CompanyName,
    string? TaxCode,
    string? ContactName,
    string? Phone,
    string? Email,
    string? Address,
    string? Note,
    bool IsActive);
