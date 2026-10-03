using FluentValidation;
using VietAnExpress.Shipments.Application.Queries;

namespace VietAnExpress.Shipments.Application.Validators;

internal sealed class TrackShipmentsQueryValidator : AbstractValidator<TrackShipmentsQuery>
{
    public TrackShipmentsQueryValidator()
    {
        RuleFor(q => q.NormalizedBills)
            .Must(bills => bills.Count <= TrackShipmentsQuery.MaxBills)
            .WithMessage($"Tra cứu tối đa {TrackShipmentsQuery.MaxBills} mã vận đơn mỗi lần");
    }
}
