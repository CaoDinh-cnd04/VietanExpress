using VietAnExpress.SharedKernel.Domain;
using VietAnExpress.SharedKernel.Exceptions;
using VietAnExpress.Shipments.Domain.Events;

namespace VietAnExpress.Shipments.Domain;

/// <summary>
/// Vận đơn — aggregate root của module Shipments.
/// Mọi thay đổi trạng thái đi qua method nghiệp vụ (IssueBill, Dispatch, MarkAsDelivered…);
/// không set Status từ bên ngoài.
/// </summary>
internal sealed class Shipment : AggregateRoot
{
    private readonly List<ShipmentPackage> _packages = [];
    private readonly List<ShipmentTrackingEvent> _trackingEvents = [];

    private Shipment() { } // EF Core

    private Shipment(Guid customerId, ShipmentDetails details, Guid? branchId)
    {
        CustomerId = customerId;
        BranchId = branchId;
        Status = ShipmentStatus.Draft;
        ApplyDetails(details);
    }

    /// <summary>Mã vận đơn (VA Bill). Chỉ có sau khi cấp bill; unique; khác khoá chính.</summary>
    public string? Code { get; private set; }

    /// <summary>Id khách hàng bên module Customers — chỉ là giá trị, không có khoá ngoại xuyên module.</summary>
    public Guid CustomerId { get; private set; }

    /// <summary>Số tham chiếu nội bộ của khách (mã đơn shop…).</summary>
    public string? CustomerReference { get; private set; }

    public ShipmentStatus Status { get; private set; }
    public ContentType ContentType { get; private set; }

    /// <summary>Mã dịch vụ / hãng (vd DHL, UPS, VA-SG).</summary>
    public string ServiceCode { get; private set; } = null!;

    public Address Sender { get; private set; } = null!;
    public Address Receiver { get; private set; } = null!;
    public string GoodsDescription { get; private set; } = null!;
    public Money DeclaredValue { get; private set; } = null!;

    public int TotalPieces { get; private set; }
    public decimal ActualWeightKg { get; private set; }
    public decimal VolumetricWeightKg { get; private set; }
    public decimal ChargeableWeightKg { get; private set; }

    public DateTimeOffset? BillIssuedAt { get; private set; }
    public DateTimeOffset? DispatchedAt { get; private set; }
    public DateTimeOffset? DeliveredAt { get; private set; }
    public string? ReceivedBy { get; private set; }
    public string? LastFailureReason { get; private set; }
    public DateTimeOffset? CancelledAt { get; private set; }
    public string? CancelReason { get; private set; }

    /// <summary>Khoá lạc quan: 2 người cùng sửa 1 đơn thì người lưu sau nhận lỗi 409.</summary>
    public byte[] RowVersion { get; private set; } = [];

    public IReadOnlyCollection<ShipmentPackage> Packages => _packages.AsReadOnly();
    public IReadOnlyCollection<ShipmentTrackingEvent> TrackingEvents => _trackingEvents.AsReadOnly();

    public bool IsEditable => Status == ShipmentStatus.Draft;

    // ---------------- Tạo & sửa nháp ----------------

    public static Shipment CreateDraft(Guid customerId, ShipmentDetails details, Guid? branchId)
    {
        if (customerId == Guid.Empty)
            throw new DomainException("SHIPMENT_CUSTOMER_REQUIRED", "Vận đơn phải thuộc 1 khách hàng");
        return new Shipment(customerId, details, branchId);
    }

    /// <summary>Chỉ sửa được khi còn là nháp — đã cấp bill thì đơn bị khoá.</summary>
    public void UpdateDraft(ShipmentDetails details)
    {
        EnsureStatus("SHIPMENT_LOCKED", "Đơn đã cấp bill, không sửa được nữa", ShipmentStatus.Draft);
        ApplyDetails(details);
    }

    // ---------------- Chuyển trạng thái ----------------

    /// <summary>Khách chốt đơn: cấp mã vận đơn và khoá đơn. Nháp → Đã cấp bill (chưa đi).</summary>
    public void IssueBill(string code, DateTimeOffset now)
    {
        EnsureStatus("SHIPMENT_BILL_ALREADY_ISSUED", "Chỉ cấp bill cho đơn nháp", ShipmentStatus.Draft);
        if (string.IsNullOrWhiteSpace(code))
            throw new DomainException("SHIPMENT_CODE_REQUIRED", "Mã vận đơn không được trống");

        Code = code.Trim().ToUpperInvariant();
        Status = ShipmentStatus.Booked;
        BillIssuedAt = now;
        _trackingEvents.Add(new ShipmentTrackingEvent(now, "Đã tạo vận đơn, chờ lấy hàng", null, isPublic: true));
        Raise(new ShipmentBillIssuedDomainEvent(Id, Code, CustomerId, now));
    }

    /// <summary>Hàng rời kho Việt An. Đã cấp bill → Đang vận chuyển.</summary>
    public void Dispatch(DateTimeOffset now, string? location)
    {
        EnsureStatus("SHIPMENT_CANNOT_DISPATCH", "Chỉ xuất đi đơn đã cấp bill và chưa đi", ShipmentStatus.Booked);

        Status = ShipmentStatus.InTransit;
        DispatchedAt = now;
        _trackingEvents.Add(new ShipmentTrackingEvent(now, "Hàng đã rời kho Việt An Express", location, isPublic: true));
    }

    /// <summary>Thêm mốc hành trình (cập nhật từ hãng, kho nước đến…).</summary>
    public void AddTrackingEvent(DateTimeOffset occurredAt, string description, string? location, bool isPublic, DateTimeOffset now)
    {
        EnsureStatus("SHIPMENT_TRACKING_CLOSED", "Chỉ cập nhật hành trình cho đơn đã cấp bill và chưa hoàn tất",
            ShipmentStatus.Booked, ShipmentStatus.InTransit, ShipmentStatus.DeliveryFailed);

        // Cho lệch đồng hồ vài phút giữa các hệ thống, nhưng không nhận mốc ở tương lai.
        if (occurredAt > now.AddMinutes(5))
            throw new DomainException("TRACKING_EVENT_IN_FUTURE", "Thời điểm hành trình không được ở tương lai");

        _trackingEvents.Add(new ShipmentTrackingEvent(occurredAt, description, location, isPublic));
    }

    /// <summary>Giao không thành công (vắng nhà, sai địa chỉ…). Đơn vẫn có thể giao lại sau.</summary>
    public void MarkDeliveryFailed(string reason, DateTimeOffset now)
    {
        EnsureStatus("SHIPMENT_NOT_IN_TRANSIT", "Chỉ báo giao lỗi cho đơn đang vận chuyển",
            ShipmentStatus.InTransit, ShipmentStatus.DeliveryFailed);
        if (string.IsNullOrWhiteSpace(reason))
            throw new DomainException("SHIPMENT_FAILURE_REASON_REQUIRED", "Nhập lý do giao không thành công");

        Status = ShipmentStatus.DeliveryFailed;
        LastFailureReason = reason.Trim();
        _trackingEvents.Add(new ShipmentTrackingEvent(now, $"Giao hàng không thành công: {LastFailureReason}", null, isPublic: true));
    }

    /// <summary>Xác nhận đã giao. Đang vận chuyển / giao lỗi → Đã giao.</summary>
    public void MarkAsDelivered(string receivedBy, DateTimeOffset deliveredAt, DateTimeOffset now)
    {
        EnsureStatus("SHIPMENT_NOT_IN_TRANSIT", "Chỉ xác nhận giao cho đơn đang vận chuyển",
            ShipmentStatus.InTransit, ShipmentStatus.DeliveryFailed);
        if (string.IsNullOrWhiteSpace(receivedBy))
            throw new DomainException("SHIPMENT_RECEIVER_REQUIRED", "Nhập tên người nhận hàng");
        if (DispatchedAt is { } dispatched && deliveredAt < dispatched)
            throw new DomainException("SHIPMENT_DELIVERED_BEFORE_DISPATCH", "Thời điểm giao không được trước lúc xuất hàng");
        if (deliveredAt > now.AddMinutes(5))
            throw new DomainException("SHIPMENT_DELIVERED_IN_FUTURE", "Thời điểm giao không được ở tương lai");

        Status = ShipmentStatus.Delivered;
        DeliveredAt = deliveredAt;
        ReceivedBy = receivedBy.Trim();
        _trackingEvents.Add(new ShipmentTrackingEvent(deliveredAt, "Đã giao hàng", null, isPublic: true));
        Raise(new ShipmentDeliveredDomainEvent(Id, Code!, CustomerId, ReceivedBy, deliveredAt));
    }

    /// <summary>Huỷ đơn — chỉ khi hàng chưa đi (nháp hoặc đã cấp bill).</summary>
    public void Cancel(string reason, DateTimeOffset now)
    {
        EnsureStatus("SHIPMENT_CANNOT_CANCEL", "Chỉ huỷ được đơn chưa đi",
            ShipmentStatus.Draft, ShipmentStatus.Booked);
        if (string.IsNullOrWhiteSpace(reason))
            throw new DomainException("SHIPMENT_CANCEL_REASON_REQUIRED", "Nhập lý do huỷ đơn");

        Status = ShipmentStatus.Cancelled;
        CancelledAt = now;
        CancelReason = reason.Trim();
        Raise(new ShipmentCancelledDomainEvent(Id, Code, CustomerId, CancelReason, now));
    }

    // ---------------- Nội bộ ----------------

    private void ApplyDetails(ShipmentDetails details)
    {
        if (details.Packages.Count == 0)
            throw new DomainException("SHIPMENT_NO_PACKAGE", "Vận đơn phải có ít nhất 1 kiện");
        if (details.Packages.Count > ShippingRules.MaxPackageLines)
            throw new DomainException("SHIPMENT_TOO_MANY_PACKAGES", $"Tối đa {ShippingRules.MaxPackageLines} dòng kiện mỗi vận đơn");
        if (string.IsNullOrWhiteSpace(details.ServiceCode))
            throw new DomainException("SHIPMENT_SERVICE_REQUIRED", "Chọn dịch vụ vận chuyển");
        if (string.IsNullOrWhiteSpace(details.GoodsDescription))
            throw new DomainException("SHIPMENT_GOODS_REQUIRED", "Nhập mô tả hàng hoá");

        ServiceCode = details.ServiceCode.Trim().ToUpperInvariant();
        Sender = details.Sender;
        Receiver = details.Receiver;
        GoodsDescription = details.GoodsDescription.Trim();
        DeclaredValue = details.DeclaredValue;
        CustomerReference = string.IsNullOrWhiteSpace(details.CustomerReference) ? null : details.CustomerReference.Trim();

        _packages.Clear();
        _packages.AddRange(details.Packages.Select(p => new ShipmentPackage(p)));

        TotalPieces = _packages.Sum(p => p.Quantity);
        ActualWeightKg = ShippingRules.Round(_packages.Sum(p => p.ActualWeightKg));
        VolumetricWeightKg = ShippingRules.Round(_packages.Sum(p => p.VolumetricWeightKg));
        ChargeableWeightKg = ShippingRules.ChargeableWeight(ActualWeightKg, VolumetricWeightKg);

        // Chứng từ quá 2kg thì hãng tính như hàng hoá → tự chuyển loại.
        ContentType = details.ContentType == ContentType.Document && ActualWeightKg > ShippingRules.DocumentMaxWeightKg
            ? ContentType.Package
            : details.ContentType;
    }

    private void EnsureStatus(string code, string message, params ShipmentStatus[] allowed)
    {
        if (!allowed.Contains(Status))
            throw new DomainException(code, $"{message} (trạng thái hiện tại: {Status})");
    }
}

/// <summary>Thông tin khách khai khi tạo / sửa đơn nháp.</summary>
internal sealed record ShipmentDetails(
    ContentType ContentType,
    string ServiceCode,
    Address Sender,
    Address Receiver,
    string GoodsDescription,
    Money DeclaredValue,
    IReadOnlyList<PackageSpec> Packages,
    string? CustomerReference);
