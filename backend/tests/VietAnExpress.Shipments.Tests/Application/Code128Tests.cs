using VietAnExpress.Shipments.Application.Orders.Documents;
using Xunit;

namespace VietAnExpress.Shipments.Tests.Application;

public class Code128Tests
{
    [Fact]
    public void Bang_mau_dung_107_ma_moi_ma_11_module_rieng_stop_13()
    {
        Assert.Equal(107, Code128.Patterns.Length);
        Assert.All(Code128.Patterns[..106], p => Assert.Equal(11, p.Sum(c => c - '0')));
        Assert.Equal(13, Code128.Patterns[106].Sum(c => c - '0'));
        Assert.Equal(107, Code128.Patterns.Distinct().Count());
    }

    [Fact]
    public void So_chan_dung_bo_C_va_checksum_dung()
    {
        // Start C (105) + 90,00,00,01; checksum = (105 + 90×1 + 0 + 0 + 1×4) mod 103 = 199 mod 103 = 96
        Assert.Equal([105, 90, 0, 0, 1, 96, 106], Code128.Encode("90000001"));
    }

    [Fact]
    public void Chu_hoac_so_le_dung_bo_B()
    {
        // Start B (104) + 'V'(54) 'A'(33) '1'(17); checksum = (104 + 54 + 66 + 51) mod 103 = 275 mod 103 = 69
        Assert.Equal([104, 54, 33, 17, 69, 106], Code128.Encode("VA1"));
        Assert.Equal(104, Code128.Encode("6010839")[0]); // 7 chữ số (lẻ) → bộ B
    }

    [Fact]
    public void Svg_co_vach_va_chan_ky_tu_la()
    {
        Assert.Contains("<rect", Code128.Svg("6010839"));
        Assert.Throws<ArgumentException>(() => Code128.Encode("Mã"));
        Assert.Throws<ArgumentException>(() => Code128.Encode(""));
    }
}
