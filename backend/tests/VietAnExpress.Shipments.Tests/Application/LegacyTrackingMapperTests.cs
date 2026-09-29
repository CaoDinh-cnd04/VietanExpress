using VietAnExpress.Shipments.Application.Queries;
using VietAnExpress.Shipments.Infrastructure.Legacy;
using Xunit;

namespace VietAnExpress.Shipments.Tests.Application;

/// <summary>Dữ liệu mẫu lấy đúng định dạng dbo.MaVanDon của hệ thống cũ.</summary>
public class LegacyTrackingMapperTests
{
    private static readonly DateTime Today = new(2026, 9, 29);

    private static LegacyOrder Row(string? pod, DateTime? sent = null) => new()
    {
        OrderNumber = 6010532,
        BillConnect = "887616850212",
        ServiceName = "Fedex|Singapore",
        ConsigneeCity = "ATIBAIA",
        ConsigneeCountry = "Brazil",
        CreateDate = new DateTime(2026, 1, 2),
        SentDate = sent,
        Pod = pod
    };

    [Theory]
    [InlineData("6010532")]
    [InlineData("887616850212")]
    public void Khop_theo_so_VA_hoac_ma_hang(string bill) =>
        Assert.True(LegacyTrackingMapper.Matches(Row(null), bill));

    [Fact]
    public void Da_giao_thi_trang_thai_ok_va_an_ten_nguoi_ky()
    {
        var result = LegacyTrackingMapper.ToResult("6010532",
            Row("16/01/2026 12:26 DELIVERED Signed for by: W.WILLIAN", sent: new DateTime(2026, 1, 5)), Today);

        Assert.True(result.Found);
        Assert.Equal("ok", result.Status);
        Assert.Equal("Fedex", result.Service);
        Assert.Equal("ATIBAIA, Brazil", result.Destination);
        Assert.Equal("16/01/2026 12:26", result.Events![0].Time);
        Assert.Equal("Đã giao hàng", result.Events[0].Title);
        Assert.DoesNotContain(result.Events, e => e.Title.Contains("WILLIAN"));
        Assert.Equal("05/01/2026", result.Events[1].Time);
    }

    [Fact]
    public void POD_co_dau_phay_sau_gio()
    {
        var result = LegacyTrackingMapper.ToResult("6003584", Row("08/01/2026 16:28, DELIVERED LYNN TAN", new DateTime(2026, 1, 3)), Today);

        Assert.Equal("ok", result.Status);
        Assert.Equal("08/01/2026 16:28", result.Events![0].Time);
    }

    [Fact]
    public void Da_gui_chua_giao_la_fly_chua_gui_la_wait()
    {
        Assert.Equal("fly", LegacyTrackingMapper.ToResult("x", Row(null, new DateTime(2026, 1, 5)), Today).Status);
        Assert.Equal("wait", LegacyTrackingMapper.ToResult("x", Row(null), Today).Status);
    }
}
