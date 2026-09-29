using Microsoft.EntityFrameworkCore;
using VietAnExpress.SharedKernel.Results;

namespace VietAnExpress.SharedKernel.Persistence;

public static class QueryableExtensions
{
    /// <summary>Đếm tổng + lấy 1 trang. Query phải đã được sắp xếp để phân trang ổn định.</summary>
    public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
        this IQueryable<T> query, int? page, int? pageSize, CancellationToken cancellationToken)
    {
        var (p, size) = Paging.Normalize(page, pageSize);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.Skip((p - 1) * size).Take(size).ToListAsync(cancellationToken);
        return new PagedResult<T>(items, p, size, total);
    }

    /// <summary>Chuỗi tìm kiếm cho LIKE: bỏ khoảng trắng thừa, escape ký tự đại diện.</summary>
    public static string? ToLikePattern(this string? search)
    {
        var s = search?.Trim();
        if (string.IsNullOrEmpty(s)) return null;
        return "%" + s.Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]") + "%";
    }
}
