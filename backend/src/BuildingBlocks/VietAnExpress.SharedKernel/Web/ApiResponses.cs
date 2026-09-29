namespace VietAnExpress.SharedKernel.Web;

/// <summary>Phản hồi 1 bản ghi / thao tác ghi — khớp hợp đồng frontend: { success, data, message? }.</summary>
public sealed record ApiResponse<T>(T Data, string? Message = null)
{
    public bool Success => true;
}

/// <summary>Phản hồi thao tác không trả dữ liệu: { success, message }.</summary>
public sealed record ApiMessage(string Message)
{
    public bool Success => true;
}

/// <summary>Phản hồi danh sách — khớp hợp đồng frontend: { success, count, data } + thông tin trang.</summary>
public sealed record ApiListResponse<T>(IReadOnlyList<T> Data, int Count, int Page, int PageSize, int TotalPages)
{
    public bool Success => true;
}
