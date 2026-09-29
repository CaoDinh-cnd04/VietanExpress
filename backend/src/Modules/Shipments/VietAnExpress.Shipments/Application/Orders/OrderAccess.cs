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
    public static readonly Error CustomerNotFound = Error.BusinessRule("CUSTOMER_NOT_FOUND",
        "Không tìm thấy hồ sơ khách hàng — vui lòng liên hệ nhân viên kinh doanh Việt An");
    public static readonly Error CustomerRequired = Error.Forbidden("ORDER_CUSTOMER_REQUIRED",
        "Vui lòng đăng nhập bằng tài khoản khách hàng để tạo đơn");
}

/// <summary>Phạm vi đơn: khách chỉ thấy / ghi đơn có CustomerID = mã khách của mình (dbo.TCustomer.CustomerID).</summary>
internal sealed class OrderAccess(ICurrentUser user, ICustomersApi customers)
{
    /// <summary>Chưa đăng nhập bằng tài khoản khách → không thấy đơn nào (Id không tồn tại).</summary>
    private const long NoCustomer = -1;

    public bool IsCustomer => user.CustomerId is not null;

    /// <summary>Mã khách để lọc đơn trong dbo.MaVanDon.</summary>
    public Task<long?> ScopeAsync(CancellationToken ct) => Task.FromResult<long?>(user.CustomerId ?? NoCustomer);

    public IQueryable<LegacyOrder> Apply(IQueryable<LegacyOrder> query, long? scope) =>
        scope is { } customerId ? query.Where(o => o.CustomerId == customerId) : query;

    /// <summary>Khách ghi đơn vào dbo.MaVanDon — kèm tên công ty, người liên hệ để điền người gửi.</summary>
    public async Task<Result<LegacyCustomerRef>> WriterAsync(CancellationToken ct)
    {
        if (user.CustomerId is not { } customerId) return Result.Failure<LegacyCustomerRef>(OrderErrors.CustomerRequired);
        var customer = await customers.GetByIdAsync(customerId, ct);
        if (customer is null) return Result.Failure<LegacyCustomerRef>(OrderErrors.CustomerNotFound);
        return new LegacyCustomerRef(customer.Id, customer.CompanyName, customer.ContactName, customer.Phone, customer.Email);
    }
}
