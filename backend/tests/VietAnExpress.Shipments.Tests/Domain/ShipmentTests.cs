using VietAnExpress.SharedKernel.Exceptions;
using VietAnExpress.Shipments.Domain;
using VietAnExpress.Shipments.Domain.Events;
using Xunit;
using static VietAnExpress.Shipments.Tests.TestData;

namespace VietAnExpress.Shipments.Tests.Domain;

public class ShipmentWeightTests
{
    [Fact]
    public void Can_thuc_va_can_quy_doi_nhan_so_luong_kien()
    {
        // 2 kiện × 3kg = 6kg thực; 2 × 50×40×30/5000 = 24kg quy đổi → tính cước 24kg (khớp test frontend).
        var shipment = Shipment.CreateDraft(Guid.NewGuid(), Details(ContentType.Package, new PackageSpec(2, 3, 50, 40, 30)), null);

        Assert.Equal(2, shipment.TotalPieces);
        Assert.Equal(6m, shipment.ActualWeightKg);
        Assert.Equal(24m, shipment.VolumetricWeightKg);
        Assert.Equal(24m, shipment.ChargeableWeightKg);
    }

    [Fact]
    public void Can_tinh_cuoc_lay_can_thuc_khi_lon_hon()
    {
        var shipment = Shipment.CreateDraft(Guid.NewGuid(), Details(ContentType.Package, new PackageSpec(1, 5, 30, 20, 15)), null);

        Assert.Equal(1.8m, shipment.VolumetricWeightKg);
        Assert.Equal(5m, shipment.ChargeableWeightKg);
    }

    [Fact]
    public void Chung_tu_qua_2kg_tu_chuyen_thanh_hang_hoa()
    {
        var heavyDoc = Shipment.CreateDraft(Guid.NewGuid(), Details(ContentType.Document, new PackageSpec(1, 2.5m, 0, 0, 0)), null);
        var lightDoc = Shipment.CreateDraft(Guid.NewGuid(), Details(ContentType.Document, new PackageSpec(1, 2m, 0, 0, 0)), null);

        Assert.Equal(ContentType.Package, heavyDoc.ContentType);
        Assert.Equal(ContentType.Document, lightDoc.ContentType);
    }

    [Fact]
    public void Khong_co_kien_thi_bao_loi()
    {
        var details = Details() with { Packages = [] };
        var ex = Assert.Throws<DomainException>(() => Shipment.CreateDraft(Guid.NewGuid(), details, null));
        Assert.Equal("SHIPMENT_NO_PACKAGE", ex.Code);
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(1, 0)]
    public void Kien_phai_co_so_luong_va_can_nang(int quantity, decimal weight)
    {
        var details = Details(ContentType.Package, new PackageSpec(quantity, weight, 10, 10, 10));
        Assert.Throws<DomainException>(() => Shipment.CreateDraft(Guid.NewGuid(), details, null));
    }
}

public class ShipmentLifecycleTests
{
    [Fact]
    public void Cap_bill_gan_ma_khoa_don_va_phat_event()
    {
        var shipment = ShipmentIn(ShipmentStatus.Draft);

        shipment.IssueBill("va10000001", Now);

        Assert.Equal(ShipmentStatus.Booked, shipment.Status);
        Assert.Equal("VA10000001", shipment.Code);
        Assert.False(shipment.IsEditable);
        Assert.Single(shipment.TrackingEvents);
        var raised = Assert.Single(shipment.DomainEvents);
        Assert.IsType<ShipmentBillIssuedDomainEvent>(raised);
    }

    [Fact]
    public void Da_cap_bill_thi_khong_sua_duoc()
    {
        var shipment = ShipmentIn(ShipmentStatus.Booked);
        var ex = Assert.Throws<DomainException>(() => shipment.UpdateDraft(Details()));
        Assert.Equal("SHIPMENT_LOCKED", ex.Code);
    }

    [Fact]
    public void Khong_cap_bill_hai_lan()
    {
        var shipment = ShipmentIn(ShipmentStatus.Booked);
        Assert.Throws<DomainException>(() => shipment.IssueBill("VA10000002", Now));
        Assert.StartsWith("VT", shipment.Code);
    }

    [Fact]
    public void Chua_xuat_hang_thi_khong_giao_duoc()
    {
        var shipment = ShipmentIn(ShipmentStatus.Booked);
        var ex = Assert.Throws<DomainException>(() => shipment.MarkAsDelivered("Lynn", Now, Now));
        Assert.Equal("SHIPMENT_NOT_IN_TRANSIT", ex.Code);
    }

    [Fact]
    public void Giao_thanh_cong_ghi_nguoi_nhan_va_phat_event()
    {
        var shipment = ShipmentIn(ShipmentStatus.InTransit);
        var deliveredAt = Now.AddDays(3);

        shipment.MarkAsDelivered("  Lynn Tan ", deliveredAt, deliveredAt);

        Assert.Equal(ShipmentStatus.Delivered, shipment.Status);
        Assert.Equal("Lynn Tan", shipment.ReceivedBy);
        Assert.Equal(deliveredAt, shipment.DeliveredAt);
        Assert.Contains(shipment.DomainEvents, e => e is ShipmentDeliveredDomainEvent);
    }

    [Fact]
    public void Giao_loi_roi_giao_lai_thanh_cong()
    {
        var shipment = ShipmentIn(ShipmentStatus.DeliveryFailed);

        shipment.MarkAsDelivered("Lynn Tan", Now.AddDays(4), Now.AddDays(4));

        Assert.Equal(ShipmentStatus.Delivered, shipment.Status);
        Assert.Equal("Vắng nhà", shipment.LastFailureReason);
    }

    [Fact]
    public void Thoi_diem_giao_khong_duoc_truoc_luc_xuat_hang()
    {
        var shipment = ShipmentIn(ShipmentStatus.InTransit);
        var ex = Assert.Throws<DomainException>(() => shipment.MarkAsDelivered("Lynn", Now, Now.AddDays(1)));
        Assert.Equal("SHIPMENT_DELIVERED_BEFORE_DISPATCH", ex.Code);
    }

    [Theory]
    [InlineData((int)ShipmentStatus.Draft)]
    [InlineData((int)ShipmentStatus.Booked)]
    public void Huy_duoc_don_chua_di(int status)
    {
        var shipment = ShipmentIn((ShipmentStatus)status);
        shipment.Cancel("Khách đổi ý", Now);
        Assert.Equal(ShipmentStatus.Cancelled, shipment.Status);
    }

    [Theory]
    [InlineData((int)ShipmentStatus.InTransit)]
    [InlineData((int)ShipmentStatus.Delivered)]
    [InlineData((int)ShipmentStatus.Cancelled)]
    public void Khong_huy_duoc_don_da_di_hoac_da_huy(int status)
    {
        var shipment = ShipmentIn((ShipmentStatus)status);
        var ex = Assert.Throws<DomainException>(() => shipment.Cancel("Khách đổi ý", Now.AddDays(5)));
        Assert.Equal("SHIPMENT_CANNOT_CANCEL", ex.Code);
    }

    [Fact]
    public void Khong_nhan_moc_hanh_trinh_o_tuong_lai()
    {
        var shipment = ShipmentIn(ShipmentStatus.InTransit);
        Assert.Throws<DomainException>(() => shipment.AddTrackingEvent(Now.AddHours(2), "Đến Singapore", "SG", true, Now));
    }
}

public class ValueObjectTests
{
    [Fact]
    public void Ma_quoc_gia_phai_2_chu_cai()
    {
        var ex = Assert.Throws<DomainException>(() => Address("VNM"));
        Assert.Equal("ADDRESS_INVALID_COUNTRY", ex.Code);
        Assert.Equal("SG", Address("sg").CountryCode);
    }

    [Fact]
    public void Tien_khong_am_va_loai_tien_3_chu()
    {
        Assert.Throws<DomainException>(() => new Money(-1, "USD"));
        Assert.Throws<DomainException>(() => new Money(1, "US"));
        Assert.Equal(new Money(10.005m, "usd"), new Money(10.01m, "USD"));
    }
}
