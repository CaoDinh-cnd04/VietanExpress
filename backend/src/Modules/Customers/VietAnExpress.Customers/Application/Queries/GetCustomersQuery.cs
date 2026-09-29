using Mapster;
using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.Customers.Application.Dtos;
using VietAnExpress.Customers.Infrastructure;
using VietAnExpress.SharedKernel.Persistence;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Customers.Application.Queries;

/// <param name="Search">Tìm theo mã, tên công ty, số điện thoại, email.</param>
internal sealed record GetCustomersQuery(string? Search, bool? IsActive, int? Page, int? PageSize)
    : IRequest<Result<PagedResult<CustomerDto>>>;

internal sealed class GetCustomersHandler(CustomersDbContext db)
    : IRequestHandler<GetCustomersQuery, Result<PagedResult<CustomerDto>>>
{
    public async Task<Result<PagedResult<CustomerDto>>> Handle(GetCustomersQuery q, CancellationToken ct)
    {
        var query = db.Customers.AsNoTracking();

        if (q.Search.ToLikePattern() is { } like)
            query = query.Where(c =>
                EF.Functions.Like(c.Code, like) ||
                EF.Functions.Like(c.CompanyName, like) ||
                (c.Phone != null && EF.Functions.Like(c.Phone, like)) ||
                (c.Email != null && EF.Functions.Like(c.Email, like)));

        if (q.IsActive is { } active)
            query = query.Where(c => c.IsActive == active);

        return await query
            .OrderBy(c => c.CompanyName).ThenBy(c => c.Id)
            .ProjectToType<CustomerDto>()
            .ToPagedResultAsync(q.Page, q.PageSize, ct);
    }
}

internal sealed record GetCustomerByIdQuery(Guid Id) : IRequest<Result<CustomerDto>>;

internal sealed class GetCustomerByIdHandler(CustomersDbContext db) : IRequestHandler<GetCustomerByIdQuery, Result<CustomerDto>>
{
    public async Task<Result<CustomerDto>> Handle(GetCustomerByIdQuery q, CancellationToken ct)
    {
        var dto = await db.Customers.AsNoTracking()
            .Where(c => c.Id == q.Id)
            .ProjectToType<CustomerDto>()
            .FirstOrDefaultAsync(ct);
        return dto is null ? CustomerErrors.NotFound(q.Id) : dto;
    }
}
