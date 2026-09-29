using VietAnExpress.SharedKernel.Domain;

namespace VietAnExpress.Shipments.Contracts;

public static class ShipmentsPermissions
{
    public const string View = "shipments.view";
    public const string Create = "shipments.create";
    public const string Update = "shipments.update";
    public const string IssueBill = "shipments.issue-bill";
    public const string Cancel = "shipments.cancel";

    /// <summary>Nghiệp vụ kho / vận hành: xuất hàng, cập nhật hành trình, xác nhận giao.</summary>
    public const string Operate = "shipments.operate";
}

/// <summary>Đơn đã được cấp mã vận đơn (khách chốt đơn) — Customers dùng để cập nhật thống kê.</summary>
public sealed record ShipmentBookedIntegrationEvent(
    Guid ShipmentId,
    string ShipmentCode,
    Guid CustomerId,
    DateTimeOffset OccurredAt) : IntegrationEvent(OccurredAt);

/// <summary>Đơn đã giao thành công.</summary>
public sealed record ShipmentDeliveredIntegrationEvent(
    Guid ShipmentId,
    string ShipmentCode,
    Guid CustomerId,
    string ReceivedBy,
    DateTimeOffset OccurredAt) : IntegrationEvent(OccurredAt);
