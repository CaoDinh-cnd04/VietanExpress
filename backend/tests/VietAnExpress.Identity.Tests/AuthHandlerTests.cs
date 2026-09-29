using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Moq;
using VietAnExpress.Customers.Contracts;
using VietAnExpress.Identity.Application;
using VietAnExpress.Identity.Application.Commands;
using VietAnExpress.Identity.Domain;
using VietAnExpress.Identity.Infrastructure;
using VietAnExpress.Identity.Infrastructure.Legacy;
using VietAnExpress.SharedKernel.Authorization;
using Xunit;

namespace VietAnExpress.Identity.Tests;

/// <summary>Dựng môi trường Identity với DB in-memory và đồng hồ có thể chỉnh.</summary>
internal sealed class IdentityFixture : IAsyncDisposable
{
    public const string Password = "MatKhau123";

    public MutableClock Clock { get; } = new(new DateTimeOffset(2026, 9, 29, 3, 0, 0, TimeSpan.Zero));
    public IdentityDbContext Db { get; } = new(
        new DbContextOptionsBuilder<IdentityDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    public PasswordService Passwords { get; } = new();
    public JwtTokenService Tokens { get; }
    public Mock<ICustomersApi> Customers { get; } = new();
    public IdentityModuleOptions Options { get; } = new() { MaxFailedLogins = 3, LockoutMinutes = 15 };
    public JwtOptions Jwt { get; } = new() { Secret = new string('k', 48) };

    public IdentityFixture() => Tokens = new JwtTokenService(Microsoft.Extensions.Options.Options.Create(Jwt), Clock);

    public SessionService Sessions => new(Db, Tokens, Customers.Object, Microsoft.Extensions.Options.Options.Create(Jwt), Clock);

    public Mock<ILegacyAccountSource> LegacyAccounts { get; } = new();

    public LoginHandler Login => new(Db, Passwords, Sessions, LegacyAccounts.Object, Customers.Object,
        Microsoft.Extensions.Options.Options.Create(Options), Clock, NullLogger<LoginHandler>.Instance);

    public RefreshSessionHandler Refresh => new(Db, Tokens, Sessions, Clock, NullLogger<RefreshSessionHandler>.Instance);

    public async Task<User> AddUserAsync(string userName = "sgb.hn", string? email = "ops@sgb.vn", params string[] permissions)
    {
        var role = new Role("customer", "Khách hàng");
        foreach (var code in permissions)
        {
            var permission = new Permission(code, code);
            Db.Permissions.Add(permission);
            role.Grant(permission.Id);
        }
        Db.Roles.Add(role);

        var user = new User(userName, "SGB Express HN", email, customerId: null, branchId: null);
        user.SetPassword(Passwords.Hash(Password), Clock.GetUtcNow());
        user.AssignRole(role.Id);
        Db.Users.Add(user);
        await Db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return user;
    }

    public ValueTask DisposeAsync() => Db.DisposeAsync();
}

internal sealed class MutableClock(DateTimeOffset now) : TimeProvider
{
    public DateTimeOffset Now { get; set; } = now;
    public override DateTimeOffset GetUtcNow() => Now;
}

public class LoginHandlerTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Dang_nhap_dung_tra_token_co_quyen_va_chi_luu_hash_refresh_token()
    {
        await using var f = new IdentityFixture();
        var user = await f.AddUserAsync(permissions: ["shipments.view"]);

        var result = await f.Login.Handle(new LoginCommand("SGB.HN", IdentityFixture.Password, Remember: true, "127.0.0.1"), Ct);

        Assert.True(result.IsSuccess);
        var session = result.Value;
        Assert.Equal("staff", session.User.AccountType);
        Assert.Contains("shipments.view", session.User.Permissions);

        var jwt = new JsonWebToken(session.AccessToken);
        Assert.Equal(user.Id.ToString(), jwt.Subject);
        Assert.Contains(jwt.Claims, c => c.Type == VaClaimTypes.Permission && c.Value == "shipments.view");

        var stored = await f.Db.RefreshTokens.SingleAsync(Ct);
        Assert.NotEqual(session.RefreshToken, stored.TokenHash);
        Assert.Equal(f.Tokens.HashRefreshToken(session.RefreshToken), stored.TokenHash);
        Assert.True(stored.IsPersistent);
    }

    [Fact]
    public async Task Dang_nhap_bang_email()
    {
        await using var f = new IdentityFixture();
        await f.AddUserAsync();

        var result = await f.Login.Handle(new LoginCommand("OPS@sgb.vn", IdentityFixture.Password, false, null), Ct);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task Sai_mat_khau_nhieu_lan_thi_khoa_tam_thoi()
    {
        await using var f = new IdentityFixture();
        await f.AddUserAsync();

        for (var i = 0; i < f.Options.MaxFailedLogins; i++)
        {
            var wrong = await f.Login.Handle(new LoginCommand("sgb.hn", "sai-mat-khau", false, null), Ct);
            Assert.Equal("INVALID_CREDENTIALS", wrong.Error.Code);
        }

        // Đúng mật khẩu nhưng đang bị khoá.
        var locked = await f.Login.Handle(new LoginCommand("sgb.hn", IdentityFixture.Password, false, null), Ct);
        Assert.Equal("ACCOUNT_LOCKED", locked.Error.Code);

        // Hết thời gian khoá thì đăng nhập lại được.
        f.Clock.Now = f.Clock.Now.AddMinutes(f.Options.LockoutMinutes + 1);
        var ok = await f.Login.Handle(new LoginCommand("sgb.hn", IdentityFixture.Password, false, null), Ct);
        Assert.True(ok.IsSuccess);
    }

    [Fact]
    public async Task Tai_khoan_khong_ton_tai_bao_cung_loi_voi_sai_mat_khau()
    {
        await using var f = new IdentityFixture();

        var result = await f.Login.Handle(new LoginCommand("khong-co", IdentityFixture.Password, false, null), Ct);

        Assert.Equal("INVALID_CREDENTIALS", result.Error.Code);
    }

    [Fact]
    public async Task Tai_khoan_khach_hang_lay_ma_va_ten_cong_ty_tu_module_customers()
    {
        await using var f = new IdentityFixture();
        var customerId = Guid.NewGuid();
        f.Customers.Setup(c => c.GetByIdAsync(customerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CustomerSummary(customerId, "KH000123", "Công ty TNHH ABC", "Chị Lan", "lan@abc.vn", null, null, true));
        var user = new User("abc", "Chị Lan", null, customerId, null);
        user.SetPassword(f.Passwords.Hash(IdentityFixture.Password), f.Clock.Now);
        f.Db.Users.Add(user);
        await f.Db.SaveChangesAsync(Ct);

        var result = await f.Login.Handle(new LoginCommand("abc", IdentityFixture.Password, false, null), Ct);

        Assert.Equal("customer", result.Value.User.AccountType);
        Assert.Equal("KH000123", result.Value.User.CustomerCode);
        Assert.Equal("Công ty TNHH ABC", result.Value.User.CompanyName);
        Assert.Contains(new JsonWebToken(result.Value.AccessToken).Claims,
            c => c.Type == VaClaimTypes.CustomerId && c.Value == customerId.ToString());
    }
}

public class RefreshSessionHandlerTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Lam_moi_thi_xoay_vong_token_cu_bi_thu_hoi()
    {
        await using var f = new IdentityFixture();
        await f.AddUserAsync();
        var login = await f.Login.Handle(new LoginCommand("sgb.hn", IdentityFixture.Password, true, null), Ct);

        var refreshed = await f.Refresh.Handle(new RefreshSessionCommand(login.Value.RefreshToken, null), Ct);

        Assert.True(refreshed.IsSuccess);
        Assert.NotEqual(login.Value.RefreshToken, refreshed.Value.RefreshToken);
        Assert.True(refreshed.Value.IsPersistent);
        var old = await f.Db.RefreshTokens.SingleAsync(t => t.TokenHash == f.Tokens.HashRefreshToken(login.Value.RefreshToken), Ct);
        Assert.Equal(RevokeReasons.Rotated, old.RevokedReason);
    }

    [Fact]
    public async Task Dung_lai_token_cu_sau_thoi_gian_an_han_thi_thu_hoi_moi_phien()
    {
        await using var f = new IdentityFixture();
        await f.AddUserAsync();
        var login = await f.Login.Handle(new LoginCommand("sgb.hn", IdentityFixture.Password, true, null), Ct);
        var refreshed = await f.Refresh.Handle(new RefreshSessionCommand(login.Value.RefreshToken, null), Ct);

        f.Clock.Now = f.Clock.Now.AddMinutes(5);
        var reuse = await f.Refresh.Handle(new RefreshSessionCommand(login.Value.RefreshToken, "10.0.0.9"), Ct);

        Assert.Equal("SESSION_EXPIRED", reuse.Error.Code);
        // Token hợp lệ vừa cấp cũng bị thu hồi → kẻ trộm và chủ tài khoản đều phải đăng nhập lại.
        var next = await f.Refresh.Handle(new RefreshSessionCommand(refreshed.Value.RefreshToken, null), Ct);
        Assert.True(next.IsFailure);
    }

    [Fact]
    public async Task Hai_tab_lam_moi_cung_luc_khong_bi_coi_la_danh_cap()
    {
        await using var f = new IdentityFixture();
        await f.AddUserAsync();
        var login = await f.Login.Handle(new LoginCommand("sgb.hn", IdentityFixture.Password, true, null), Ct);
        var refreshed = await f.Refresh.Handle(new RefreshSessionCommand(login.Value.RefreshToken, null), Ct);

        f.Clock.Now = f.Clock.Now.AddSeconds(5);
        var slowTab = await f.Refresh.Handle(new RefreshSessionCommand(login.Value.RefreshToken, null), Ct);

        Assert.True(slowTab.IsFailure);
        var stillValid = await f.Refresh.Handle(new RefreshSessionCommand(refreshed.Value.RefreshToken, null), Ct);
        Assert.True(stillValid.IsSuccess);
    }
}

public class LegacyLoginTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Khach_he_thong_cu_dang_nhap_lan_dau_duoc_chuyen_sang_tai_khoan_moi()
    {
        await using var f = new IdentityFixture();
        var viewOrders = new Permission("shipments.view", "Xem vận đơn");
        var customerRole = new Role("customer", "Khách hàng");
        customerRole.Grant(viewOrders.Id);
        f.Db.Permissions.Add(viewOrders);
        f.Db.Roles.Add(customerRole);
        await f.Db.SaveChangesAsync(Ct);

        var customerId = Guid.NewGuid();
        f.LegacyAccounts.Setup(l => l.VerifyAsync("PTA145078103", "123456", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LegacyAccount(200877, "PTA145078103"));
        f.Customers.Setup(c => c.ImportLegacyCustomerAsync(200877, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CustomerSummary(customerId, "SCS", "SCS CO., LTD", null, null, null, null, true));
        f.Customers.Setup(c => c.GetByIdAsync(customerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CustomerSummary(customerId, "SCS", "SCS CO., LTD", null, null, null, null, true));

        var first = await f.Login.Handle(new LoginCommand("PTA145078103", "123456", false, null), Ct);

        Assert.True(first.IsSuccess);
        Assert.Equal("SCS", first.Value.User.CustomerCode);
        // Ngay lần đầu token đã có quyền của vai trò customer (lỗi cũ: tài khoản chưa lưu nên token rỗng quyền).
        Assert.Contains("shipments.view", first.Value.User.Permissions);
        var user = await f.Db.Users.SingleAsync(u => u.CustomerId == customerId, Ct);
        Assert.NotEqual("123456", user.PasswordHash);
        Assert.NotEmpty(user.Roles);

        // Lần sau đăng nhập bằng tài khoản mới, không hỏi lại hệ thống cũ.
        f.LegacyAccounts.Invocations.Clear();
        var second = await f.Login.Handle(new LoginCommand("pta145078103", "123456", false, null), Ct);
        Assert.True(second.IsSuccess);
        f.LegacyAccounts.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Sai_mat_khau_he_thong_cu_thi_bao_sai_thong_tin()
    {
        await using var f = new IdentityFixture();

        var result = await f.Login.Handle(new LoginCommand("PTA145078103", "sai", false, null), Ct);

        Assert.Equal("INVALID_CREDENTIALS", result.Error.Code);
        f.Customers.Verify(c => c.ImportLegacyCustomerAsync(It.IsAny<long>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
