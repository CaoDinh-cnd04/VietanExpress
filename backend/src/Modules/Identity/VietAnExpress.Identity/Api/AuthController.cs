using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using VietAnExpress.Identity.Application;
using VietAnExpress.Identity.Application.Commands;
using VietAnExpress.Identity.Application.Dtos;
using VietAnExpress.Identity.Application.Queries;
using VietAnExpress.Identity.Infrastructure;
using VietAnExpress.SharedKernel.Web;

namespace VietAnExpress.Identity.Api;

/// <summary>
/// Đăng nhập / làm mới / đăng xuất.
/// Mặc định (web portal): token trả qua cookie HttpOnly, body chỉ có thông tin người dùng — khớp frontend.
/// Ứng dụng khác (mobile, tích hợp): gọi với ?useCookies=false để nhận token trong body và gửi header Authorization: Bearer.
/// </summary>
[ApiVersion(1)]
[Route("api/v{version:apiVersion}/auth")]
[Tags("Tài khoản")]
internal sealed class AuthController(IOptions<JwtOptions> jwt) : ApiControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Login)]
    [ProducesResponseType<ApiResponse<SessionUserDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<TokenResponse>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Login(LoginRequest body, [FromQuery] bool useCookies = true, CancellationToken ct = default)
    {
        var result = await Sender.Send(new LoginCommand(body.UserName, body.Password, body.Remember, ClientIp), ct);
        return result.IsSuccess ? SessionResponse(result.Value, useCookies, "Đăng nhập thành công") : Problem(result.Error);
    }

    /// <summary>Làm mới phiên. Refresh token lấy từ body, nếu không có thì từ cookie.</summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Login)]
    [ProducesResponseType<ApiResponse<SessionUserDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Refresh(RefreshRequest? body, CancellationToken ct)
    {
        var fromBody = !string.IsNullOrEmpty(body?.RefreshToken);
        var token = fromBody ? body!.RefreshToken : Request.Cookies[AuthCookies.Refresh];
        if (string.IsNullOrEmpty(token)) return Problem(IdentityErrors.SessionExpired);

        var result = await Sender.Send(new RefreshSessionCommand(token!, ClientIp), ct);
        if (result.IsFailure && !fromBody) AuthCookies.Clear(Response, jwt.Value);
        return result.IsSuccess ? SessionResponse(result.Value, useCookies: !fromBody, message: null) : Problem(result.Error);
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType<ApiMessage>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout(RefreshRequest? body, CancellationToken ct)
    {
        var token = body?.RefreshToken ?? Request.Cookies[AuthCookies.Refresh];
        await Sender.Send(new LogoutCommand(token), ct);
        AuthCookies.Clear(Response, jwt.Value);
        return Ok(new ApiMessage("Đã đăng xuất"));
    }

    [HttpPost("change-password")]
    [Authorize]
    [ProducesResponseType<ApiMessage>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest body, CancellationToken ct) =>
        FromResult(
            await Sender.Send(new ChangePasswordCommand(body.CurrentPassword, body.NewPassword, Request.Cookies[AuthCookies.Refresh]), ct),
            "Đã đổi mật khẩu. Các thiết bị khác sẽ phải đăng nhập lại");

    private string? ClientIp => HttpContext.Connection.RemoteIpAddress?.ToString();

    private IActionResult SessionResponse(AuthSession session, bool useCookies, string? message)
    {
        if (!useCookies)
            return OkData(new TokenResponse(session.User, session.AccessToken, session.AccessTokenExpiresAt,
                session.RefreshToken, session.RefreshTokenExpiresAt), message);

        AuthCookies.Write(Response, session, jwt.Value);
        return OkData(session.User, message);
    }
}

/// <summary>Thông tin người đang đăng nhập — frontend gọi khi mở trang để biết đã đăng nhập chưa (401 = chưa).</summary>
[ApiVersion(1)]
[Route("api/v{version:apiVersion}/me")]
[Tags("Tài khoản")]
[Authorize]
internal sealed class MeController : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<ApiResponse<SessionUserDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct) => FromResult(await Sender.Send(new GetSessionQuery(), ct));
}

/// <param name="UserName">Mã khách hàng / tên đăng nhập hoặc email (frontend gửi trường "username").</param>
internal sealed record LoginRequest(string UserName, string Password, bool Remember = false);

internal sealed record RefreshRequest(string? RefreshToken);

internal sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

internal sealed record TokenResponse(
    SessionUserDto User,
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAt);
