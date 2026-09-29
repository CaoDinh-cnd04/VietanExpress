using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.Customers.Application;

internal static class CustomerErrors
{
    public static Error NotFound(Guid id) => Error.NotFound("CUSTOMER_NOT_FOUND", $"Không tìm thấy khách hàng {id}");
    public static Error CodeTaken(string code) => Error.Conflict("CUSTOMER_CODE_TAKEN", $"Mã khách hàng {code} đã tồn tại");
}
