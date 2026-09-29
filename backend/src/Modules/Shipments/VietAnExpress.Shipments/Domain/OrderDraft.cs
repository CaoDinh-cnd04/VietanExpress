using VietAnExpress.SharedKernel.Domain;
using VietAnExpress.SharedKernel.Exceptions;

namespace VietAnExpress.Shipments.Domain;

/// <summary>
/// Đơn nháp trên portal ("Đơn nháp &amp; chưa in"). Chỉ là dữ liệu tạm của portal — khi khách bấm
/// "In &amp; cấp bill" đơn được ghi thành 1 dòng trong dbo.MaVanDon rồi nháp bị xoá.
/// <see cref="PayloadJson"/> giữ nguyên toàn bộ form tạo đơn để mở lại sửa tiếp.
/// </summary>
internal sealed class OrderDraft : BaseEntity
{
    public const string StatusDraft = "draft";
    public const string StatusReady = "ready";

    private OrderDraft() { } // EF Core

    public OrderDraft(long customerId, OrderDraftSummary summary, string payloadJson)
    {
        CustomerId = customerId;
        Update(summary, payloadJson);
    }

    /// <summary>Khách sở hữu nháp — dbo.TCustomer.CustomerID.</summary>
    public long CustomerId { get; private set; }
    public string Status { get; private set; } = StatusDraft;
    public string Consignee { get; private set; } = null!;
    public string Country { get; private set; } = null!;
    public string ServiceName { get; private set; } = null!;
    public string Branch { get; private set; } = null!;
    public string Reference { get; private set; } = null!;
    public string PiecesText { get; private set; } = null!;
    public string Content { get; private set; } = null!;
    public string PayloadJson { get; private set; } = "{}";

    /// <summary>Số vận đơn đã cấp khi in — nháp được xoá mềm nhưng giữ lại để in invoice đủ từng dòng hàng.</summary>
    public long? PrintedOrderNumber { get; private set; }

    public bool IsReady => Status == StatusReady;

    public void MarkPrinted(long orderNumber) => PrintedOrderNumber = orderNumber;

    public void Update(OrderDraftSummary summary, string payloadJson)
    {
        if (summary.Status is not (StatusDraft or StatusReady))
            throw new DomainException("DRAFT_INVALID_STATUS", "Trạng thái đơn nháp không hợp lệ");

        Status = summary.Status;
        Consignee = summary.Consignee.Trim();
        Country = summary.Country.Trim();
        ServiceName = summary.ServiceName.Trim();
        Branch = summary.Branch.Trim();
        Reference = summary.Reference.Trim();
        PiecesText = summary.PiecesText.Trim();
        Content = summary.Content.Trim();
        PayloadJson = payloadJson;
    }
}

/// <summary>Các cột tóm tắt hiển thị ở bảng đơn nháp (frontend tự tính khi lưu).</summary>
internal sealed record OrderDraftSummary(
    string Status,
    string Consignee,
    string Country,
    string ServiceName,
    string Branch,
    string Reference,
    string PiecesText,
    string Content);
