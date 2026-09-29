using Microsoft.EntityFrameworkCore;
using Moq;
using VietAnExpress.Customers.Contracts;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;
using VietAnExpress.Shipments.Application.Commands;
using VietAnExpress.Shipments.Application.Queries;
using VietAnExpress.Shipments.Domain;
using VietAnExpress.Shipments.Infrastructure.Legacy;
using Xunit;
using static VietAnExpress.Shipments.Tests.TestData;

namespace VietAnExpress.Shipments.Tests.Application;

[Collection(SqlServerCollection.Name)]
public class CreateShipmentDraftHandlerTests(SqlServerFixture sql)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static Mock<ICustomersApi> CustomersReturning(Guid id, bool isActive = true)
    {
        var customers = new Mock<ICustomersApi>();
        customers.Setup(c => c.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CustomerSummary(id, "KH000001", "SGB Express HN", null, null, null, null, isActive));
        return customers;
    }

    private static Mock<ICurrentUser> User(Guid? customerId = null)
    {
        var user = new Mock<ICurrentUser>();
        user.SetupGet(u => u.CustomerId).Returns(customerId);
        return user;
    }

    [Fact]
    public async Task Tai_khoan_khach_hang_luon_tao_don_cho_chinh_minh()
    {
        var ownId = Guid.NewGuid();
        var customers = CustomersReturning(ownId);
        SqlServerFixture.SkipIfUnavailable();
        await using var db = sql.CreateDb();
        var handler = new CreateShipmentDraftHandler(db, customers.Object, User(ownId).Object);

        // Khách cố gửi CustomerId của người khác → bị bỏ qua.
        var result = await handler.Handle(new CreateShipmentDraftCommand(Guid.NewGuid(), Input()), Ct);

        Assert.True(result.IsSuccess);
        Assert.Equal(ownId, result.Value.CustomerId);
        Assert.Equal(ShipmentStatus.Draft, result.Value.Status);
        Assert.Null(result.Value.Code);
        customers.Verify(c => c.GetByIdAsync(ownId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Nhan_vien_phai_chon_khach_hang()
    {
        SqlServerFixture.SkipIfUnavailable();
        await using var db = sql.CreateDb();
        var handler = new CreateShipmentDraftHandler(db, new Mock<ICustomersApi>().Object, User().Object);

        var result = await handler.Handle(new CreateShipmentDraftCommand(null, Input()), Ct);

        Assert.True(result.IsFailure);
        Assert.Equal("SHIPMENT_CUSTOMER_REQUIRED", result.Error.Code);
    }

    [Fact]
    public async Task Khach_ngung_hoat_dong_khong_tao_duoc_don()
    {
        var customerId = Guid.NewGuid();
        SqlServerFixture.SkipIfUnavailable();
        await using var db = sql.CreateDb();
        var handler = new CreateShipmentDraftHandler(db, CustomersReturning(customerId, isActive: false).Object, User().Object);

        var result = await handler.Handle(new CreateShipmentDraftCommand(customerId, Input()), Ct);

        Assert.Equal(ErrorType.BusinessRule, result.Error.Type);
        Assert.Equal(0, await db.Shipments.CountAsync(s => s.CustomerId == customerId, Ct));
    }
}

[Collection(SqlServerCollection.Name)]
public class ShipmentQueryTests(SqlServerFixture sql)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Khach_khong_xem_duoc_don_cua_khach_khac()
    {
        SqlServerFixture.SkipIfUnavailable();
        await using var db = sql.CreateDb();
        var shipment = ShipmentIn(ShipmentStatus.Booked, customerId: Guid.NewGuid());
        db.Shipments.Add(shipment);
        await db.SaveChangesAsync(Ct);

        var otherCustomer = new Mock<ICurrentUser>();
        otherCustomer.SetupGet(u => u.CustomerId).Returns(Guid.NewGuid());
        var result = await new GetShipmentHandlers(db, otherCustomer.Object).Handle(new GetShipmentByIdQuery(shipment.Id), Ct);

        Assert.Equal(ErrorType.NotFound, result.Error.Type);
    }

    [Fact]
    public async Task Chi_tiet_don_co_hanh_trinh_moi_nhat_truoc()
    {
        SqlServerFixture.SkipIfUnavailable();
        await using var db = sql.CreateDb();
        var shipment = ShipmentIn(ShipmentStatus.InTransit);
        db.Shipments.Add(shipment);
        await db.SaveChangesAsync(Ct);

        var result = await new GetShipmentHandlers(db, new Mock<ICurrentUser>().Object).Handle(new GetShipmentByIdQuery(shipment.Id), Ct);

        var events = result.Value.TrackingEvents;
        Assert.Equal(2, events.Count);
        Assert.True(events[0].OccurredAt > events[1].OccurredAt);
        Assert.Equal("SG", result.Value.Receiver.CountryCode);
        Assert.Single(result.Value.Packages);
    }
}

[Collection(SqlServerCollection.Name)]
public class TrackShipmentsHandlerTests(SqlServerFixture sql)
{
    private static ILegacyBillReader NoLegacyBills => Mock.Of<ILegacyBillReader>(r =>
        r.FindAsync(It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()) == Task.FromResult<IReadOnlyList<LegacyOrder>>(Array.Empty<LegacyOrder>()));

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Tra_cuu_cong_khai_tra_trang_thai_rut_gon_va_an_ghi_chu_noi_bo()
    {
        SqlServerFixture.SkipIfUnavailable();
        await using var db = sql.CreateDb();
        var code = UniqueCode();
        var shipment = ShipmentIn(ShipmentStatus.InTransit, code: code);
        shipment.AddTrackingEvent(Now.AddHours(2), "Ghi chú nội bộ: kiện móp", null, isPublic: false, Now.AddHours(3));
        db.Shipments.AddRange(shipment, ShipmentIn(ShipmentStatus.Draft));
        await db.SaveChangesAsync(Ct);

        var results = await new TrackShipmentsHandler(db, NoLegacyBills, TimeProvider.System).Handle(new TrackShipmentsQuery([code.ToLowerInvariant(), "VA99999999"]), Ct);

        Assert.Equal(2, results.Count);
        var found = results[0];
        Assert.True(found.Found);
        Assert.Equal(code, found.Bill);
        Assert.Equal("fly", found.Status);
        Assert.Equal("Singapore, SG", found.Destination);
        Assert.DoesNotContain(found.Events!, e => e.Title.Contains("nội bộ"));
        Assert.False(results[1].Found);
        Assert.Null(results[1].Events);
    }

    [Fact]
    public async Task Don_da_huy_xem_nhu_khong_ton_tai()
    {
        SqlServerFixture.SkipIfUnavailable();
        await using var db = sql.CreateDb();
        var code = UniqueCode();
        db.Shipments.Add(ShipmentIn(ShipmentStatus.Cancelled, code: code));
        await db.SaveChangesAsync(Ct);

        var results = await new TrackShipmentsHandler(db, NoLegacyBills, TimeProvider.System).Handle(new TrackShipmentsQuery([code]), Ct);

        Assert.False(Assert.Single(results).Found);
    }

    [Fact]
    public void Chuan_hoa_ma_bo_trung_giu_thu_tu()
    {
        var query = new TrackShipmentsQuery([" va1 ", "VA1", "", "b2"]);
        Assert.Equal(new[] { "VA1", "B2" }, query.NormalizedBills);
    }
}
