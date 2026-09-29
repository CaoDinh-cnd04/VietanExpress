using FluentValidation;
using VietAnExpress.Shipments.Application.Commands;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Application.Queries;
using VietAnExpress.Shipments.Domain;

namespace VietAnExpress.Shipments.Application.Validators;

// Validator kiểm tra dữ liệu đầu vào để trả lỗi 400 đẹp theo từng ô;
// bất biến nghiệp vụ vẫn được domain kiểm tra lại (không tin tưởng tầng trên).

internal sealed class AddressDtoValidator : AbstractValidator<AddressDto>
{
    public AddressDtoValidator()
    {
        RuleFor(x => x.ContactName).NotEmpty().WithMessage("Nhập tên người liên hệ").MaximumLength(150);
        RuleFor(x => x.CompanyName).MaximumLength(250);
        RuleFor(x => x.Phone).NotEmpty().WithMessage("Nhập số điện thoại").MaximumLength(50);
        RuleFor(x => x.Email).MaximumLength(150);
        RuleFor(x => x.Line1).NotEmpty().WithMessage("Nhập địa chỉ").MaximumLength(250);
        RuleFor(x => x.Line2).MaximumLength(250);
        RuleFor(x => x.City).NotEmpty().WithMessage("Nhập thành phố").MaximumLength(100);
        RuleFor(x => x.State).MaximumLength(100);
        RuleFor(x => x.PostalCode).MaximumLength(20);
        RuleFor(x => x.CountryCode)
            .NotEmpty().WithMessage("Chọn quốc gia")
            .Matches("^[A-Za-z]{2}$").WithMessage("Mã quốc gia gồm 2 chữ cái (vd VN, US)");
    }
}

internal sealed class ShipmentInputValidator : AbstractValidator<ShipmentInput>
{
    public ShipmentInputValidator()
    {
        RuleFor(x => x.ContentType).IsInEnum().WithMessage("Loại hàng không hợp lệ (document / package)");
        RuleFor(x => x.ServiceCode).NotEmpty().WithMessage("Chọn dịch vụ").MaximumLength(30);
        RuleFor(x => x.GoodsDescription).NotEmpty().WithMessage("Nhập mô tả hàng hoá").MaximumLength(500);
        RuleFor(x => x.CustomerReference).MaximumLength(100);
        RuleFor(x => x.Sender).NotNull().SetValidator(new AddressDtoValidator());
        RuleFor(x => x.Receiver).NotNull().SetValidator(new AddressDtoValidator());

        RuleFor(x => x.DeclaredValue).NotNull();
        RuleFor(x => x.DeclaredValue.Amount).GreaterThanOrEqualTo(0).WithMessage("Giá trị khai báo không được âm")
            .When(x => x.DeclaredValue is not null);
        RuleFor(x => x.DeclaredValue.Currency).Matches("^[A-Za-z]{3}$").WithMessage("Loại tiền gồm 3 chữ cái (vd USD)")
            .When(x => x.DeclaredValue is not null);

        RuleFor(x => x.Packages)
            .NotEmpty().WithMessage("Thêm ít nhất 1 kiện")
            .Must(p => p.Count <= ShippingRules.MaxPackageLines).WithMessage($"Tối đa {ShippingRules.MaxPackageLines} dòng kiện");
        RuleForEach(x => x.Packages).ChildRules(p =>
        {
            p.RuleFor(k => k.Quantity).InclusiveBetween(1, 999).WithMessage("Số lượng kiện từ 1 đến 999");
            p.RuleFor(k => k.WeightKg).GreaterThan(0).WithMessage("Cân nặng phải lớn hơn 0").LessThanOrEqualTo(10_000);
            p.RuleFor(k => k.LengthCm).InclusiveBetween(0, 1_000);
            p.RuleFor(k => k.WidthCm).InclusiveBetween(0, 1_000);
            p.RuleFor(k => k.HeightCm).InclusiveBetween(0, 1_000);
        });
    }
}

internal sealed class CreateShipmentDraftCommandValidator : AbstractValidator<CreateShipmentDraftCommand>
{
    public CreateShipmentDraftCommandValidator() =>
        RuleFor(x => x.Shipment).NotNull().SetValidator(new ShipmentInputValidator());
}

internal sealed class UpdateShipmentDraftCommandValidator : AbstractValidator<UpdateShipmentDraftCommand>
{
    public UpdateShipmentDraftCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Shipment).NotNull().SetValidator(new ShipmentInputValidator());
    }
}

internal sealed class CancelShipmentCommandValidator : AbstractValidator<CancelShipmentCommand>
{
    public CancelShipmentCommandValidator() =>
        RuleFor(x => x.Reason).NotEmpty().WithMessage("Nhập lý do huỷ").MaximumLength(500);
}

internal sealed class AddTrackingEventCommandValidator : AbstractValidator<AddTrackingEventCommand>
{
    public AddTrackingEventCommandValidator()
    {
        RuleFor(x => x.Description).NotEmpty().WithMessage("Nhập nội dung hành trình").MaximumLength(500);
        RuleFor(x => x.Location).MaximumLength(200);
    }
}

internal sealed class MarkDeliveredCommandValidator : AbstractValidator<MarkDeliveredCommand>
{
    public MarkDeliveredCommandValidator() =>
        RuleFor(x => x.ReceivedBy).NotEmpty().WithMessage("Nhập tên người nhận").MaximumLength(150);
}

internal sealed class MarkDeliveryFailedCommandValidator : AbstractValidator<MarkDeliveryFailedCommand>
{
    public MarkDeliveryFailedCommandValidator() =>
        RuleFor(x => x.Reason).NotEmpty().WithMessage("Nhập lý do giao không thành công").MaximumLength(500);
}

internal sealed class TrackShipmentsQueryValidator : AbstractValidator<TrackShipmentsQuery>
{
    public TrackShipmentsQueryValidator()
    {
        RuleFor(x => x.Bills).NotNull();
        RuleFor(x => x.NormalizedBills)
            .NotEmpty().WithMessage("Nhập ít nhất 1 số vận đơn")
            .Must(b => b.Count <= TrackShipmentsQuery.MaxBills).WithMessage($"Tra tối đa {TrackShipmentsQuery.MaxBills} vận đơn mỗi lần")
            .OverridePropertyName("bills");
        RuleForEach(x => x.NormalizedBills)
            .Matches("^[A-Z0-9]{6,30}$").WithMessage("Số vận đơn '{PropertyValue}' không hợp lệ")
            .OverridePropertyName("bills");
    }
}
