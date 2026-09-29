using VietAnExpress.Customers.Contracts;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;
using VietAnExpress.Shipments.Infrastructure.Legacy;

namespace VietAnExpress.Shipments.Application.Orders;

internal static class OrderErrors
{
    public static Error NotFound(string bill) => Error.NotFound("ORDER_NOT_FOUND", $"Không tìm thấy đơn {bill}");
    public static readonly Error DraftNotFound = Error.NotFound("DRAFT_NOT_FOUND", "Không tìm thấy đơn nháp");
    public static readonly Error DraftNotReady =
        Error.BusinessRule("DRAFT_NOT_READY", "Đơn chưa khai đủ thông tin — mở đơn, hoàn tất rồi bấm In");
    public static readonly Error InvalidPayload =
        Error.BusinessRule("DRAFT_INVALID_PAYLOAD", "Dữ liệu đơn nháp không đọc được — vui lòng mở đơn và lưu lại");
    public static readonly Error NotLinked = Error.BusinessRule("CUSTOMER_NOT_LINKED",
        "Tài khoản chưa liên kết mã khách hàng Việt An nên chưa tạo đơn được — vui lòng liên hệ nhân viên kinh doanh");
    public static readonly Error StaffCannotCreate = Error.BusinessRule("ORDER_CUSTOMER_REQUIRED",
        "Đơn trên portal được tạo bằng tài khoản khách hàng — nhân viên tạo đơn trên hệ thống nội bộ");
}

/// <summary>Phạm vi đơn theo người dùng: khách chỉ thấy đơn có CustomerID = mã khách cũ của mình; nhân viên thấy tất cả.</summary>
internal sealed class OrderAccess(ICurrentUser user, ICustomersApi customers)
{
    /// <summary>Khách chưa liên kết mã cũ → không thấy đơn nào (trả Id không tồn tại).</summary>
    private const long NoCustomer = -1;

    public bool IsCustomer => user.CustomerId is not null;

    /// <summary>Mã khách cũ để lọc; null = nhân viên (không lọc).</summary>
    public async Task<long?> ScopeAsync(CancellationToken ct)
    {
        if (user.CustomerId is not { } customerId) return null;
        var customer = await customers.GetByIdAsync(customerId, ct);
        return customer?.LegacyId ?? NoCustomer;
    }

    public IQueryable<LegacyOrder> Apply(IQueryable<LegacyOrder> query, long? scope) =>
        scope is { } legacyId ? query.Where(o => o.CustomerId == legacyId) : query;

    /// <summary>Khách được phép ghi đơn vào dbo.MaVanDon (phải có mã khách cũ).</summary>
    public async Task<Result<LegacyCustomerRef>> WriterAsync(CancellationToken ct)
    {
        if (user.CustomerId is not { } customerId) return Result.Failure<LegacyCustomerRef>(OrderErrors.StaffCannotCreate);
        var customer = await customers.GetByIdAsync(customerId, ct);
        if (customer?.LegacyId is not { } legacyId) return Result.Failure<LegacyCustomerRef>(OrderErrors.NotLinked);
        return new LegacyCustomerRef(legacyId, customer.CompanyName, customer.ContactName, customer.Phone, customer.Email);
    }
}
