using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;
using VietAnExpress.Shipments.Domain;
using VietAnExpress.Shipments.Infrastructure;

namespace VietAnExpress.Shipments.Application.Orders;

/// <summary>Gợi ý mô tả hàng theo nhóm — khớp <c>Category.suggestions</c> của frontend.</summary>
internal sealed record CategorySuggestionDto(string En, string Vi, string Hs);

/// <summary>1 nhóm hàng — khớp <c>Category</c> của frontend (web/src/features/create-order/api.ts).</summary>
/// <param name="IsOwn">Nhóm khách tự tạo (được sửa / xóa); false = nhóm chung Việt An.</param>
internal sealed record GoodsCategoryDto(string Id, string Name, bool IsFavorite, bool IsOwn, IReadOnlyList<CategorySuggestionDto> Suggestions);

/// <summary>Body POST / PUT /catalog/categories.</summary>
internal sealed record GoodsCategoryInput(string? Name, bool IsFavorite);

internal static class GoodsCategoryErrors
{
    public static readonly Error NotFound = Error.NotFound("CATEGORY_NOT_FOUND", "Không tìm thấy nhóm hàng (nhóm chung của Việt An không sửa / xóa được)");
    public static readonly Error NameRequired = Error.Validation("CATEGORY_NAME_REQUIRED", "Nhập tên nhóm hàng");
    public static readonly Error NameTooLong = Error.Validation("CATEGORY_NAME_TOO_LONG", $"Tên nhóm tối đa {GoodsCategory.NameMaxLength} ký tự");
    public static Error Duplicate(string name) => Error.Conflict("CATEGORY_DUPLICATE", $"Đã có nhóm hàng \"{name}\"");
}

internal static class GoodsCategoryRules
{
    /// <summary>Kiểm tra tên; trả tên đã chuẩn hóa.</summary>
    public static Result<string> ValidateName(string? raw)
    {
        var name = GoodsCategory.NormalizeName(raw);
        if (name.Length == 0) return GoodsCategoryErrors.NameRequired;
        if (name.Length > GoodsCategory.NameMaxLength) return GoodsCategoryErrors.NameTooLong;
        return name;
    }

    /// <summary>
    /// Nhóm yêu thích (của khách hoặc nhóm chung khách đã đánh dấu) lên đầu; rồi nhóm của khách (theo tên),
    /// cuối cùng nhóm chung (theo thứ tự Việt An đặt).
    /// </summary>
    /// <param name="favoriteSharedIds">ID nhóm chung khách đánh dấu yêu thích (dbo.MatHangKhachHang).</param>
    public static IReadOnlyList<GoodsCategoryDto> Order(IEnumerable<GoodsCategory> categories, IReadOnlySet<long>? favoriteSharedIds = null) =>
        categories
            .Select(c => (Category: c, Favorite: IsFavorite(c, favoriteSharedIds)))
            .OrderByDescending(x => x.Favorite)
            .ThenBy(x => x.Category.CustomerId is null)
            .ThenBy(x => x.Category.CustomerId is null ? x.Category.SortOrder : 0)
            .ThenBy(x => x.Category.Name, StringComparer.CurrentCultureIgnoreCase)
            .Select(x => ToDto(x.Category, x.Favorite))
            .ToList();

    private static bool IsFavorite(GoodsCategory c, IReadOnlySet<long>? favoriteSharedIds) =>
        c.CustomerId is null ? favoriteSharedIds?.Contains(c.Id) == true : c.IsFavorite;

    public static GoodsCategoryDto ToDto(GoodsCategory c) => ToDto(c, c.IsFavorite);

    private static GoodsCategoryDto ToDto(GoodsCategory c, bool isFavorite) =>
        new(c.Id.ToString(System.Globalization.CultureInfo.InvariantCulture), c.Name, isFavorite, c.CustomerId is not null, []);
}

// ---------- GET /catalog/categories ----------

internal sealed record GetGoodsCategoriesQuery : IRequest<IReadOnlyList<GoodsCategoryDto>>;

// ---------- POST / PUT / DELETE /catalog/categories ----------

internal sealed record SaveGoodsCategoryCommand(long? Id, GoodsCategoryInput Input) : IRequest<Result<GoodsCategoryDto>>;

internal sealed record DeleteGoodsCategoryCommand(long Id) : IRequest<Result>;

/// <summary>Đánh dấu / bỏ yêu thích — được cả nhóm chung (lưu riêng cho khách trong dbo.MatHangKhachHang).</summary>
internal sealed record SetCategoryFavoriteCommand(long Id, bool IsFavorite) : IRequest<Result>;

internal sealed class GoodsCategoryHandlers(ShipmentsDbContext db, ICurrentUser user, TimeProvider clock) :
    IRequestHandler<GetGoodsCategoriesQuery, IReadOnlyList<GoodsCategoryDto>>,
    IRequestHandler<SaveGoodsCategoryCommand, Result<GoodsCategoryDto>>,
    IRequestHandler<DeleteGoodsCategoryCommand, Result>,
    IRequestHandler<SetCategoryFavoriteCommand, Result>
{
    /// <summary>Nhóm chung + nhóm của khách đang đăng nhập.</summary>
    private IQueryable<GoodsCategory> Visible() =>
        user.CustomerId is { } customerId
            ? db.GoodsCategories.Where(c => c.CustomerId == null || c.CustomerId == customerId)
            : db.GoodsCategories.Where(c => c.CustomerId == null);

    public async Task<IReadOnlyList<GoodsCategoryDto>> Handle(GetGoodsCategoriesQuery q, CancellationToken ct)
    {
        var categories = await Visible().AsNoTracking().ToListAsync(ct);
        if (user.CustomerId is not { } customerId) return GoodsCategoryRules.Order(categories);

        var keys = await db.CatalogMarks.AsNoTracking()
            .Where(m => m.CustomerId == customerId && m.Kind == CatalogMark.Category && m.IsFavorite)
            .Select(m => m.Key)
            .ToListAsync(ct);
        var favorites = keys.Select(k => long.TryParse(k, out var id) ? id : 0).Where(id => id > 0).ToHashSet();
        return GoodsCategoryRules.Order(categories, favorites);
    }

    public async Task<Result> Handle(SetCategoryFavoriteCommand cmd, CancellationToken ct)
    {
        if (user.CustomerId is not { } customerId) return OrderErrors.CustomerRequired;
        var category = await Visible().FirstOrDefaultAsync(c => c.Id == cmd.Id, ct);
        if (category is null) return GoodsCategoryErrors.NotFound;

        var now = VietnamTime.Now(clock);
        if (category.CustomerId is null)
        {
            var key = category.Id.ToString(System.Globalization.CultureInfo.InvariantCulture);
            await CatalogMarkStore.UpsertAsync(db, customerId, CatalogMark.Category, key, m => m.SetFavorite(cmd.IsFavorite, now), now, ct);
        }
        else
        {
            category.Update(category.Name, cmd.IsFavorite, now);
            await db.SaveChangesAsync(ct);
        }
        return Result.Success();
    }

    public async Task<Result<GoodsCategoryDto>> Handle(SaveGoodsCategoryCommand cmd, CancellationToken ct)
    {
        if (user.CustomerId is not { } customerId) return OrderErrors.CustomerRequired;
        var name = GoodsCategoryRules.ValidateName(cmd.Input.Name);
        if (name.IsFailure) return name.Error;

        // Không trùng tên (không phân biệt hoa thường — theo collation của DB) với nhóm chung / nhóm khác của khách.
        var duplicate = await Visible().AnyAsync(c => c.Name == name.Value && (cmd.Id == null || c.Id != cmd.Id), ct);
        if (duplicate) return GoodsCategoryErrors.Duplicate(name.Value);

        var now = VietnamTime.Now(clock);
        GoodsCategory? category;
        if (cmd.Id is { } id)
        {
            category = await db.GoodsCategories.FirstOrDefaultAsync(c => c.Id == id && c.CustomerId == customerId, ct);
            if (category is null) return GoodsCategoryErrors.NotFound;
            category.Update(name.Value, cmd.Input.IsFavorite, now);
        }
        else
        {
            category = GoodsCategory.Create(customerId, name.Value, cmd.Input.IsFavorite, now);
            db.GoodsCategories.Add(category);
        }
        await db.SaveChangesAsync(ct);
        return GoodsCategoryRules.ToDto(category);
    }

    public async Task<Result> Handle(DeleteGoodsCategoryCommand cmd, CancellationToken ct)
    {
        if (user.CustomerId is not { } customerId) return OrderErrors.CustomerRequired;
        var deleted = await db.GoodsCategories.Where(c => c.Id == cmd.Id && c.CustomerId == customerId).ExecuteDeleteAsync(ct);
        return deleted == 0 ? GoodsCategoryErrors.NotFound : Result.Success();
    }
}
