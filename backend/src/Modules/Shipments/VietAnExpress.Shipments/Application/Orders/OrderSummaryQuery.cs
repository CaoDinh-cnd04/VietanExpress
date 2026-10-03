using System.Linq.Expressions;
using VietAnExpress.Shipments.Infrastructure.Legacy;

namespace VietAnExpress.Shipments.Application.Orders;

/// <summary>Thống kê cùng tập đơn bằng một truy vấn SQL, dùng lại điều kiện trạng thái chuẩn.</summary>
internal static class OrderSummaryQuery
{
    private sealed record Row(bool Waiting, bool InTransit, bool NotDelivered, bool Delivered, bool Late, int Pieces, decimal Weight);

    internal sealed record Totals(int All, int Waiting, int InTransit, int NotDelivered, int Delivered, int Late, int Pieces, decimal Weight)
    {
        public static readonly Totals Empty = new(0, 0, 0, 0, 0, 0, 0, 0);
        public Dictionary<string, int> Counts() => new()
        {
            ["all"] = All, [LegacyOrderStatus.Waiting] = Waiting,
            [LegacyOrderStatus.InTransit] = InTransit, [LegacyOrderStatus.NotDelivered] = NotDelivered,
            [LegacyOrderStatus.Delivered] = Delivered, [LegacyOrderStatus.Late] = Late
        };
    }

    public static IQueryable<Totals> Build(IQueryable<LegacyOrder> orders, DateTime today)
    {
        var parameter = Expression.Parameter(typeof(LegacyOrder), "order");
        Expression Condition(string code)
        {
            var predicate = LegacyOrderStatus.Is(code, today);
            return new ReplaceParameter(predicate.Parameters[0], parameter).Visit(predicate.Body)!;
        }
        var constructor = typeof(Row).GetConstructors().Single();
        // Each COUNT evaluates its own predicate instead of repeating a five-branch status CASE.
        // Supplying constructor members lets EF inline this projection into SQL aggregates.
        var row = Expression.New(constructor, [Condition(LegacyOrderStatus.Waiting),
            Condition(LegacyOrderStatus.InTransit), Condition(LegacyOrderStatus.NotDelivered),
            Condition(LegacyOrderStatus.Delivered), Condition(LegacyOrderStatus.Late),
            Expression.Coalesce(Expression.Property(parameter, nameof(LegacyOrder.Pieces)), Expression.Constant(0)),
            Expression.Coalesce(Expression.Property(parameter, nameof(LegacyOrder.WeightKg)), Expression.Constant(0m))],
            constructor.GetParameters().Select(p => typeof(Row).GetProperty(p.Name!)!));
        var projection = Expression.Lambda<Func<LegacyOrder, Row>>(row, parameter);

        return orders.Select(projection).GroupBy(_ => 1).Select(g => new Totals(
            g.Count(), g.Count(o => o.Waiting), g.Count(o => o.InTransit),
            g.Count(o => o.NotDelivered), g.Count(o => o.Delivered), g.Count(o => o.Late),
            g.Sum(o => o.Pieces), g.Sum(o => o.Weight)));
    }

    private sealed class ReplaceParameter(ParameterExpression from, ParameterExpression to) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node) => node == from ? to : base.VisitParameter(node);
    }
}
