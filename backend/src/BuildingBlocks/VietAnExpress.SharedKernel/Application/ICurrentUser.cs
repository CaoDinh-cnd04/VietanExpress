namespace VietAnExpress.SharedKernel.Application;

/// <summary>
/// Người dùng của request hiện tại (đọc từ JWT). Portal chỉ cho khách hàng đăng nhập (tài khoản ở dbo.TCustomer).
/// Ngoài HTTP (job, startup) thì chưa xác thực.
/// </summary>
public interface ICurrentUser
{
    bool IsAuthenticated { get; }
    string? UserName { get; }

    /// <summary>dbo.TCustomer.CustomerID của khách đang đăng nhập — mọi dữ liệu phải lọc theo khách này.</summary>
    long? CustomerId { get; }

    /// <summary>Có khi đăng nhập bằng tài khoản con (nhân viên); null = tài khoản chính (admin) của khách.</summary>
    long? StaffId { get; }

    bool HasPermission(string permission);
}
