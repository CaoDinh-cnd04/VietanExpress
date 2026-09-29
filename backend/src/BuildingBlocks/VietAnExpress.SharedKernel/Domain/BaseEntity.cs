namespace VietAnExpress.SharedKernel.Domain;

/// <summary>
/// Entity gốc cho mọi bảng nghiệp vụ: khoá Guid, audit, xoá mềm, chi nhánh.
/// Các trường audit do <c>AuditableEntityInterceptor</c> tự điền — code nghiệp vụ không set tay.
/// </summary>
public abstract class BaseEntity
{
    protected BaseEntity() => Id = Guid.CreateVersion7();

    protected BaseEntity(Guid id) => Id = id;

    public Guid Id { get; protected set; }

    public DateTimeOffset CreatedAt { get; private set; }
    /// <summary>Id người tạo; null = hệ thống (seed, job nền).</summary>
    public Guid? CreatedBy { get; private set; }
    public DateTimeOffset? UpdatedAt { get; private set; }
    public Guid? UpdatedBy { get; private set; }

    public bool IsDeleted { get; private set; }
    public DateTimeOffset? DeletedAt { get; private set; }
    public Guid? DeletedBy { get; private set; }

    /// <summary>
    /// Chi nhánh / bưu cục sở hữu bản ghi. Null = dùng chung toàn công ty.
    /// Khi tạo mới mà chưa gán, interceptor lấy chi nhánh của người dùng hiện tại.
    /// </summary>
    public Guid? BranchId { get; protected set; }

    public void AssignBranch(Guid? branchId) => BranchId = branchId;

    internal void MarkCreated(DateTimeOffset at, Guid? by, Guid? defaultBranchId)
    {
        CreatedAt = at;
        CreatedBy = by;
        BranchId ??= defaultBranchId;
    }

    internal void MarkUpdated(DateTimeOffset at, Guid? by)
    {
        UpdatedAt = at;
        UpdatedBy = by;
    }

    internal void MarkDeleted(DateTimeOffset at, Guid? by)
    {
        IsDeleted = true;
        DeletedAt = at;
        DeletedBy = by;
        MarkUpdated(at, by);
    }
}
