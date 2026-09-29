using FluentValidation;
using VietAnExpress.Identity.Application.Commands;

namespace VietAnExpress.Identity.Application.Validators;

internal static class PasswordPolicy
{
    /// <summary>Tối thiểu 8 ký tự, có cả chữ và số — ĐỒNG BỘ với frontend (ChangePasswordPage, PASSWORD_RULE).</summary>
    public const string Pattern = @"^(?=.*[A-Za-z])(?=.*\d).{8,}$";
    public const string Message = "Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số";

    public static IRuleBuilderOptions<T, string> StrongPassword<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().WithMessage("Nhập mật khẩu")
            .MaximumLength(128)
            .Matches(Pattern).WithMessage(Message);
}

internal sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.UserName).NotEmpty().WithMessage("Nhập mã khách hàng hoặc email").MaximumLength(150);
        RuleFor(x => x.Password).NotEmpty().WithMessage("Nhập mật khẩu").MaximumLength(128);
    }
}

internal sealed class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
{
    public ChangePasswordCommandValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().WithMessage("Nhập mật khẩu hiện tại");
        RuleFor(x => x.NewPassword).StrongPassword()
            .NotEqual(x => x.CurrentPassword).WithMessage("Mật khẩu mới phải khác mật khẩu hiện tại");
    }
}

internal sealed class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.UserName)
            .NotEmpty().WithMessage("Nhập tên đăng nhập")
            .Length(3, 100).WithMessage("Tên đăng nhập 3–100 ký tự")
            .Matches(@"^[A-Za-z0-9._@-]+$").WithMessage("Tên đăng nhập chỉ gồm chữ không dấu, số và . _ @ -");
        RuleFor(x => x.FullName).NotEmpty().WithMessage("Nhập họ tên").MaximumLength(150);
        RuleFor(x => x.Email)
            .Must(e => string.IsNullOrWhiteSpace(e) || (e.Contains('@') && e.Length <= 150))
            .WithMessage("Email không hợp lệ");
        RuleFor(x => x.Password).StrongPassword();
        RuleFor(x => x.Roles).NotEmpty().WithMessage("Chọn ít nhất 1 vai trò");
    }
}
