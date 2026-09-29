using FluentValidation;
using VietAnExpress.Shipments.Application.Orders;
using VietAnExpress.Shipments.Application.Orders.Documents;
using VietAnExpress.Shipments.Domain;

namespace VietAnExpress.Shipments.Application.Validators;

internal sealed class SaveDraftCommandValidator : AbstractValidator<SaveDraftCommand>
{
    /// <summary>Giới hạn kích thước form lưu kèm nháp (ký tự JSON).</summary>
    private const int MaxPayloadChars = 256 * 1024;

    public SaveDraftCommandValidator()
    {
        RuleFor(x => x.Draft).NotNull();
        RuleFor(x => x.Draft.Stt)
            .Must(s => s is OrderDraft.StatusDraft or OrderDraft.StatusReady)
            .WithMessage("Trạng thái nháp phải là draft hoặc ready")
            .OverridePropertyName("stt");
        RuleFor(x => x.Draft.PayloadJson.Length)
            .LessThanOrEqualTo(MaxPayloadChars).WithMessage("Dữ liệu đơn quá lớn")
            .OverridePropertyName("payload");
    }
}

internal sealed class CreateOrdersBatchCommandValidator : AbstractValidator<CreateOrdersBatchCommand>
{
    public const int MaxOrders = 100;

    public CreateOrdersBatchCommandValidator()
    {
        RuleFor(x => x.Orders)
            .NotEmpty().WithMessage("Chưa có đơn nào để tạo")
            .Must(o => o.Count <= MaxOrders).WithMessage($"Tối đa {MaxOrders} đơn mỗi lần");
        RuleForEach(x => x.Orders).ChildRules(o =>
        {
            o.RuleFor(r => r.Cnee).NotEmpty().WithMessage("Thiếu tên người nhận");
            o.RuleFor(r => r.Ct).NotEmpty().WithMessage("Thiếu nước đến");
        });
    }
}

internal sealed class PrintOrdersQueryValidator : AbstractValidator<PrintOrdersQuery>
{
    public PrintOrdersQueryValidator()
    {
        RuleFor(x => x.Doc)
            .Must(d => PrintDocs.All.Contains(d))
            .WithMessage("Loại chứng từ không hợp lệ (bill-a4, invoice, cvck, label-a6)");
        RuleFor(x => x.Bills)
            .NotEmpty().WithMessage("Chọn ít nhất 1 đơn để in")
            .Must(b => b.Count <= PrintOrdersQuery.MaxBills).WithMessage($"In tối đa {PrintOrdersQuery.MaxBills} đơn mỗi lần");
    }
}
