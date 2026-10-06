namespace VietAnExpress.Shipments.Domain;

/// <summary>
/// Nhân viên (tài khoản con) đã tạo 1 vận đơn — bảng phụ <c>dbo.VanDonNguoiTao</c> (người dùng đã đồng ý), không đụng cấu trúc dbo.MaVanDon.
/// Chỉ có dòng cho đơn do tài khoản con tạo; đơn của tài khoản chính hay hệ thống cũ không có dòng.
/// Tài khoản con không có quyền "xem toàn bộ đơn của công ty" chỉ thấy đơn có dòng ở đây với StaffID của mình.
/// </summary>
internal sealed class OrderCreator
{
    private OrderCreator() { } // EF Core

    public OrderCreator(long orderId, long customerId, long staffId, DateTime now)
    {
        OrderId = orderId;
        CustomerId = customerId;
        StaffId = staffId;
        CreateDate = now;
    }

    /// <summary>dbo.MaVanDon.ID.</summary>
    public long OrderId { get; private set; }
    /// <summary>dbo.TCustomer.CustomerID của khách sở hữu đơn.</summary>
    public long CustomerId { get; private set; }
    /// <summary>dbo.TaiKhoanNhanVien.ID — tài khoản con đã tạo đơn.</summary>
    public long StaffId { get; private set; }
    public DateTime CreateDate { get; private set; }
}
