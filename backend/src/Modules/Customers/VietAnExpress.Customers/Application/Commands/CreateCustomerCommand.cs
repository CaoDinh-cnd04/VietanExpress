using Mapster;
using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.Customers.Application.Dtos;
using VietAnExpress.Customers.Domain;
using VietAnExpress.Customers.Infrastructure;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Customers.Application.Commands;

/// <param name="Code">Bỏ trống để hệ thống tự sinh (KH000001…).</param>
internal sealed record CreateCustomerCommand(
    string? Code,
    string CompanyName,
    string? TaxCode,
    string? ContactName,
    string? Phone,
    string? Email,
    string? Address,
    string? Note,
    Guid? BranchId) : IRequest<Result<CustomerDto>>;

internal sealed class CreateCustomerHandler(CustomersDbContext db, ICustomerCodeGenerator codes)
    : IRequestHandler<CreateCustomerCommand, Result<CustomerDto>>
{
    public async Task<Result<CustomerDto>> Handle(CreateCustomerCommand cmd, CancellationToken ct)
    {
        var code = cmd.Code?.Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(code))
        {
            code = await codes.NextAsync(ct);
        }
        else if (await db.Customers.IgnoreQueryFilters().AnyAsync(c => c.Code == code, ct))
        {
            return CustomerErrors.CodeTaken(code);
        }

        var customer = new Customer(code, cmd.Adapt<CustomerProfile>(), cmd.BranchId);
        db.Customers.Add(customer);
        await db.SaveChangesAsync(ct);
        return customer.Adapt<CustomerDto>();
    }
}
