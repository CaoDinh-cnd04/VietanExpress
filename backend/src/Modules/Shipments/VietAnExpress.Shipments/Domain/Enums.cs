namespace VietAnExpress.Shipments.Domain;

/// <summary>
/// Vòng đời vận đơn:
/// Draft (nháp) → Booked (đã cấp bill, chưa đi) → InTransit (đã xuất đi)
///   → Delivered (đã giao) | DeliveryFailed (giao lỗi, có thể giao lại → Delivered).
/// Draft / Booked có thể Cancelled.
/// </summary>
internal enum ShipmentStatus
{
    Draft = 0,
    Booked = 10,
    InTransit = 20,
    DeliveryFailed = 30,
    Delivered = 40,
    Cancelled = 90
}

internal enum ContentType
{
    /// <summary>Chứng từ (DOC).</summary>
    Document = 1,
    /// <summary>Hàng hoá (PACK).</summary>
    Package = 2
}
