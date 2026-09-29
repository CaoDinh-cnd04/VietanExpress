using FluentValidation;
using VietAnExpress.Customers.Application.Commands;

namespace VietAnExpress.Customers.Application.Validators;

internal sealed class CreateCustomerCommandValidator : AbstractValidator<CreateCustomerCommand>
{
    public CreateCustomerCommandValidator()
    {
        RuleFor(x => x.Code)
            .MaximumLength(20).WithMessage("Mã khách hàng tối đa 20 ký tự")
            .Matches("^[A-Za-z0-9_-]*$").WithMessage("Mã khách hàng chỉ gồm chữ, số, gạch nối");
        RuleFor(x => x.CompanyName).CompanyName();
        RuleFor(x => x.Email).OptionalEmail();
        RuleFor(x => x.Phone).OptionalPhone();
    }
}

internal sealed class UpdateCustomerCommandValidator : AbstractValidator<UpdateCustomerCommand>
{
    public UpdateCustomerCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.CompanyName).CompanyName();
        RuleFor(x => x.Email).OptionalEmail();
        RuleFor(x => x.Phone).OptionalPhone();
    }
}

/// <summary>Quy tắc hồ sơ khách dùng chung cho tạo / sửa. Trường tuỳ chọn để trống thì bỏ qua.</summary>
internal static class CustomerRules
{
    public static IRuleBuilderOptions<T, string> CompanyName<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().WithMessage("Nhập tên công ty / khách hàng")
            .MaximumLength(250).WithMessage("Tên khách hàng tối đa 250 ký tự");

    public static IRuleBuilderOptions<T, string?> OptionalEmail<T>(this IRuleBuilder<T, string?> rule) =>
        rule.Must(v => string.IsNullOrWhiteSpace(v) || (v.Length <= 150 && v.Contains('@') && !v.Contains(' ')))
            .WithMessage("Email không hợp lệ");

    public static IRuleBuilderOptions<T, string?> OptionalPhone<T>(this IRuleBuilder<T, string?> rule) =>
        rule.Matches(@"^([0-9+()\s.-]{6,20})?$").WithMessage("Số điện thoại không hợp lệ");
}
