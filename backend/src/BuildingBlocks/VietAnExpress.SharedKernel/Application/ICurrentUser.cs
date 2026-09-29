namespace VietAnExpress.SharedKernel.Application;

/// <summary>Người dùng của request hiện tại (đọc từ JWT). Ngoài HTTP (seed, job) thì chưa xác thực.</summary>
public interface ICurrentUser
{
    bool IsAuthenticated { get; }
    Guid? UserId { get; }
    string? UserName { get; }
    Guid? BranchId { get; }

    /// <summary>Có giá trị khi là tài khoản khách hàng (portal) — dữ liệu phải lọc theo khách này.</summary>
    Guid? CustomerId { get; }

    bool HasPermission(string permission);
}
