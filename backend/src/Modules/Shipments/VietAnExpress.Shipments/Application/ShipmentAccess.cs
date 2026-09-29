using Microsoft.EntityFrameworkCore;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;
using VietAnExpress.Shipments.Domain;
using VietAnExpress.Shipments.Infrastructure;

namespace VietAnExpress.Shipments.Application;

internal static class ShipmentErrors
{
    public static Error NotFound(Guid id) => Error.NotFound("SHIPMENT_NOT_FOUND", $"Không tìm thấy vận đơn {id}");
    public static Error NotFound(string code) => Error.NotFound("SHIPMENT_NOT_FOUND", $"Không tìm thấy vận đơn {code}");
    public static readonly Error CustomerRequired = Error.Validation("SHIPMENT_CUSTOMER_REQUIRED", "Chọn khách hàng cho vận đơn");
    public static readonly Error CustomerNotFound = Error.NotFound("CUSTOMER_NOT_FOUND", "Không tìm thấy khách hàng");
    public static readonly Error CustomerInactive = Error.BusinessRule("CUSTOMER_INACTIVE", "Khách hàng đã ngừng hoạt động, không tạo đơn được");
}

internal static class ShipmentAccess
{
    /// <summary>
    /// Phạm vi dữ liệu: tài khoản khách hàng chỉ thấy đơn của chính mình; nhân viên thấy tất cả.
    /// (Lọc theo chi nhánh cho nhân viên: bổ sung khi có module Chi nhánh.)
    /// Đơn của khách khác trả "không tìm thấy" thay vì 403 để không lộ sự tồn tại.
    /// </summary>
    public static IQueryable<Shipment> VisibleTo(this IQueryable<Shipment> query, ICurrentUser user) =>
        user.CustomerId is { } customerId ? query.Where(s => s.CustomerId == customerId) : query;

    public static IQueryable<Shipment> WithDetails(this IQueryable<Shipment> query) =>
        query.Include(s => s.Packages).Include(s => s.TrackingEvents).AsSplitQuery();

    public static Task<Shipment?> FindForUpdateAsync(
        this ShipmentsDbContext db, Guid id, ICurrentUser user, CancellationToken ct) =>
        db.Shipments.VisibleTo(user).WithDetails().FirstOrDefaultAsync(s => s.Id == id, ct);
}
