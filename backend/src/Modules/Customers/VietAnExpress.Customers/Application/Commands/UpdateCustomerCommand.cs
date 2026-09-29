using Mapster;
using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.Customers.Application.Dtos;
using VietAnExpress.Customers.Domain;
using VietAnExpress.Customers.Infrastructure;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Customers.Application.Commands;

internal sealed record UpdateCustomerCommand(
    Guid Id,
    string CompanyName,
    string? TaxCode,
    string? ContactName,
    string? Phone,
    string? Email,
    string? Address,
    string? Note,
    bool IsActive) : IRequest<Result<CustomerDto>>;

internal sealed class UpdateCustomerHandler(CustomersDbContext db) : IRequestHandler<UpdateCustomerCommand, Result<CustomerDto>>
{
    public async Task<Result<CustomerDto>> Handle(UpdateCustomerCommand cmd, CancellationToken ct)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == cmd.Id, ct);
        if (customer is null) return CustomerErrors.NotFound(cmd.Id);

        customer.Update(cmd.Adapt<CustomerProfile>());
        customer.SetActive(cmd.IsActive);
        await db.SaveChangesAsync(ct);
        return customer.Adapt<CustomerDto>();
    }
}
