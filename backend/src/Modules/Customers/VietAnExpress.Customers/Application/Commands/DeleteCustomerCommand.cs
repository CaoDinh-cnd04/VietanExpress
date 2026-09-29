using Mapster;
using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.Customers.Application.Dtos;
using VietAnExpress.Customers.Domain;
using VietAnExpress.Customers.Infrastructure;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Customers.Application.Commands;

internal sealed record DeleteCustomerCommand(Guid Id) : IRequest<Result>;

internal sealed class DeleteCustomerHandler(CustomersDbContext db) : IRequestHandler<DeleteCustomerCommand, Result>
{
    public async Task<Result> Handle(DeleteCustomerCommand cmd, CancellationToken ct)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == cmd.Id, ct);
        if (customer is null) return CustomerErrors.NotFound(cmd.Id);

        db.Customers.Remove(customer); // interceptor đổi thành xoá mềm
        await db.SaveChangesAsync(ct);
        return Result.Success();
    }
}
