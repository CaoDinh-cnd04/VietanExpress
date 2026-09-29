using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.Identity.Application.Dtos;
using VietAnExpress.Identity.Infrastructure;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Persistence;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Identity.Application.Queries;

// ---------- Người đang đăng nhập (GET /me) ----------

internal sealed record GetSessionQuery : IRequest<Result<SessionUserDto>>;

internal sealed class GetSessionHandler(IdentityDbContext db, SessionService sessions, ICurrentUser currentUser, TimeProvider clock)
    : IRequestHandler<GetSessionQuery, Result<SessionUserDto>>
{
    public async Task<Result<SessionUserDto>> Handle(GetSessionQuery q, CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUser.UserId, ct);
        if (user is null || !user.IsActive || user.IsLockedOut(clock.GetUtcNow())) return IdentityErrors.SessionExpired;
        return await sessions.BuildSessionUserAsync(user, ct);
    }
}

// ---------- Danh sách tài khoản ----------

internal sealed record GetUsersQuery(string? Search, int? Page, int? PageSize) : IRequest<Result<PagedResult<UserDto>>>;

internal sealed class GetUsersHandler(IdentityDbContext db) : IRequestHandler<GetUsersQuery, Result<PagedResult<UserDto>>>
{
    public async Task<Result<PagedResult<UserDto>>> Handle(GetUsersQuery q, CancellationToken ct)
    {
        var query = db.Users.AsNoTracking();
        if (q.Search.ToLikePattern() is { } like)
            query = query.Where(u =>
                EF.Functions.Like(u.UserName, like) ||
                EF.Functions.Like(u.FullName, like) ||
                (u.Email != null && EF.Functions.Like(u.Email, like)));

        var page = await query
            .OrderBy(u => u.UserName)
            .Select(u => new
            {
                u.Id, u.UserName, u.FullName, u.Email, u.IsActive, u.CustomerId, u.BranchId, u.LastLoginAt, u.CreatedAt,
                Roles = db.UserRoles.Where(ur => ur.UserId == u.Id)
                    .Join(db.Roles, ur => ur.RoleId, r => r.Id, (_, r) => r.Name)
                    .ToList()
            })
            .ToPagedResultAsync(q.Page, q.PageSize, ct);

        return page.Map(u => new UserDto(u.Id, u.UserName, u.FullName, u.Email, u.IsActive, u.CustomerId, u.BranchId,
            u.Roles.Order().ToList(), u.LastLoginAt, u.CreatedAt));
    }
}
