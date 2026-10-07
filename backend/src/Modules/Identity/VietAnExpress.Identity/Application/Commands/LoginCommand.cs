using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.Identity.Application.Dtos;
using VietAnExpress.Identity.Contracts;
using VietAnExpress.Identity.Infrastructure;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Identity.Application.Commands;

// ---------- Đăng nhập ----------

/// <summary>
/// Đăng nhập bằng Login_UserName / Login_Password của dbo.TCustomer (đúng tài khoản khách đang dùng ở hệ thống cũ — admin),
/// không khớp thì thử tài khoản con của nhân viên (dbo.TaiKhoanNhanVien).
/// </summary>
internal sealed record LoginCommand(string UserName, string Password, bool Remember) : IRequest<Result<AuthSession>>;

internal sealed class LoginHandler(IdentityDbContext db, SessionService sessions, TimeProvider clock) : IRequestHandler<LoginCommand, Result<AuthSession>>
{
    public async Task<Result<AuthSession>> Handle(LoginCommand cmd, CancellationToken ct)
    {
        var userName = cmd.UserName.Trim();
        var candidates = await db.Logins.AsNoTracking()
            .Where(l => l.UserName == userName && l.Password != null && l.Password != "")
            .ToListAsync(ct);

        var login = candidates.FirstOrDefault(l => JwtTokenService.FixedTimeEquals(l.Password!, cmd.Password));
        if (login is not null)
        {
            var session = await sessions.StartAsync(login, cmd.Remember, ct);
            return session is null ? IdentityErrors.InvalidCredentials : session;
        }

        var staff = await db.StaffAccounts.FirstOrDefaultAsync(s => s.UserName == userName, ct);
        if (staff is null || !StaffPasswordHasher.Verify(staff.PasswordHash, cmd.Password)) return IdentityErrors.InvalidCredentials;
        if (!staff.IsActive) return IdentityErrors.StaffDisabled;

        var staffSession = await sessions.StartAsync(staff, cmd.Remember, ct);
        if (staffSession is null) return IdentityErrors.InvalidCredentials;
        staff.RecordLogin(VietnamTime.Now(clock));
        await db.SaveChangesAsync(ct);
        return staffSession;
    }
}

// ---------- Làm mới phiên ----------

/// <summary>
/// Đổi refresh token lấy cặp token mới. Refresh token không lưu DB: hợp lệ khi đúng chữ ký, còn hạn
/// và mật khẩu (dbo.TCustomer, hoặc dbo.TaiKhoanNhanVien với tài khoản con) chưa đổi kể từ lúc cấp; tài khoản con còn hoạt động.
/// </summary>
internal sealed record RefreshSessionCommand(string RefreshToken) : IRequest<Result<AuthSession>>;

internal sealed class RefreshSessionHandler(IdentityDbContext db, ITokenService tokens, SessionService sessions)
    : IRequestHandler<RefreshSessionCommand, Result<AuthSession>>
{
    public async Task<Result<AuthSession>> Handle(RefreshSessionCommand cmd, CancellationToken ct)
    {
        var claims = await tokens.ReadRefreshTokenAsync(cmd.RefreshToken);
        if (claims is null) return IdentityErrors.SessionExpired;

        if (claims.StaffId is { } staffId)
        {
            var staff = await db.StaffAccounts.AsNoTracking().FirstOrDefaultAsync(s => s.Id == staffId && s.CustomerId == claims.CustomerId, ct);
            if (staff is null || !staff.IsActive
                || !JwtTokenService.FixedTimeEquals(tokens.PasswordStamp(staff.CustomerId, staff.PasswordHash, staff.Id), claims.PasswordStamp))
                return IdentityErrors.SessionExpired;
            var staffSession = await sessions.StartAsync(staff, claims.IsPersistent, ct);
            return staffSession is null ? IdentityErrors.SessionExpired : staffSession;
        }

        var login = await db.Logins.AsNoTracking().FirstOrDefaultAsync(l => l.CustomerId == claims.CustomerId, ct);
        if (login is null || !login.HasPassword
            || !JwtTokenService.FixedTimeEquals(tokens.PasswordStamp(login.CustomerId, login.Password!), claims.PasswordStamp))
            return IdentityErrors.SessionExpired;

        var session = await sessions.StartAsync(login, claims.IsPersistent, ct);
        return session is null ? IdentityErrors.SessionExpired : session;
    }
}

// ---------- Đổi mật khẩu ----------

/// <summary>
/// Ghi mật khẩu mới vào dbo.TCustomer.Login_Password (dạng chữ thường như hệ thống cũ — 2 hệ thống dùng chung);
/// tài khoản con không được tự đổi (admin đặt lại).
/// Mọi phiên cũ hết hiệu lực; thiết bị đang dùng nhận phiên mới ngay, giữ kiểu phiên (ghi nhớ hay không) theo refresh token hiện tại.
/// </summary>
internal sealed record ChangePasswordCommand(string CurrentPassword, string NewPassword, string? CurrentRefreshToken) : IRequest<Result<AuthSession>>;

internal sealed class ChangePasswordHandler(IdentityDbContext db, ITokenService tokens, SessionService sessions, ICurrentUser currentUser)
    : IRequestHandler<ChangePasswordCommand, Result<AuthSession>>
{
    public async Task<Result<AuthSession>> Handle(ChangePasswordCommand cmd, CancellationToken ct)
    {
        if (currentUser.CustomerId is not { } customerId) return IdentityErrors.SessionExpired;
        var persistent = cmd.CurrentRefreshToken is { Length: > 0 } rt && (await tokens.ReadRefreshTokenAsync(rt))?.IsPersistent == true;

        // Tài khoản con không có quyền này — admin đặt lại ở trang Tài khoản nhân viên (POST /account/staff/{id}/reset-password).
        if (!currentUser.HasPermission(IdentityPermissions.ChangePassword)) return IdentityErrors.StaffPasswordManagedByAdmin;

        var login = await db.Logins.FirstOrDefaultAsync(l => l.CustomerId == customerId, ct);
        if (login is null || !login.HasPassword) return IdentityErrors.SessionExpired;
        if (!JwtTokenService.FixedTimeEquals(login.Password!, cmd.CurrentPassword)) return IdentityErrors.WrongCurrentPassword;

        login.ChangePassword(cmd.NewPassword);
        await db.SaveChangesAsync(ct);

        var session = await sessions.StartAsync(login, persistent, ct);
        return session is null ? IdentityErrors.SessionExpired : session;
    }
}

// ---------- Khách đang đăng nhập (GET /me) ----------

internal sealed record GetSessionQuery : IRequest<Result<SessionUserDto>>;

internal sealed class GetSessionHandler(IdentityDbContext db, SessionService sessions, ICurrentUser currentUser)
    : IRequestHandler<GetSessionQuery, Result<SessionUserDto>>
{
    public async Task<Result<SessionUserDto>> Handle(GetSessionQuery q, CancellationToken ct)
    {
        if (currentUser.CustomerId is not { } customerId) return IdentityErrors.SessionExpired;
        SessionUserDto? user;
        if (currentUser.StaffId is { } staffId)
        {
            var staff = await db.StaffAccounts.AsNoTracking().FirstOrDefaultAsync(s => s.Id == staffId && s.CustomerId == customerId, ct);
            user = staff is null ? null : await sessions.BuildUserAsync(staff, ct);
        }
        else
        {
            var login = await db.Logins.AsNoTracking().FirstOrDefaultAsync(l => l.CustomerId == customerId, ct);
            user = login is { HasPassword: true } ? await sessions.BuildUserAsync(login, ct) : null;
        }
        return user is null ? IdentityErrors.SessionExpired : user;
    }
}
