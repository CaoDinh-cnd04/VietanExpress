using VietAnExpress.Ecommerce.Domain;
using Xunit;

namespace VietAnExpress.Ecommerce.Tests;

public class MarketplaceOrderTests
{
    private static readonly DateTime Now = new(2026, 10, 5, 9, 0, 0);

    private static ImportedOrder Imported(string name = "#1") =>
        new("1", name, MarketplaceRecipient.Empty, 1, null, "USD", 10, null, null, Now);

    [Fact]
    public void Don_da_xoa_khong_bi_dong_bo_ghi_lai()
    {
        var o = MarketplaceOrder.Import(1, null, "shopify", Imported(), Now);
        Assert.True(o.Delete(Now));
        Assert.False(o.UpdateFrom(Imported("#1-moi"), Now));
        Assert.Equal("#1", o.OrderName);
        Assert.False(o.Delete(Now)); // xóa lần 2 không có tác dụng
    }

    [Fact]
    public void Nhap_lai_file_khoi_phuc_don_da_xoa()
    {
        var o = MarketplaceOrder.Import(1, null, "shopify", Imported(), Now);
        o.Edit(MarketplaceRecipient.Empty with { Name = "Taro" }, 1, null, 1, null, null, null, null, null, Now);
        o.Delete(Now);
        Assert.True(o.Restore(Imported("#1-file"), Now));
        Assert.Null(o.DeletedAt);
        Assert.Null(o.EditedAt);
        Assert.Equal("#1-file", o.OrderName);
        Assert.False(o.Restore(Imported(), Now)); // chưa xóa thì không khôi phục
    }

    [Fact]
    public void Don_da_sua_khong_bi_dong_bo_ghi_de()
    {
        var o = MarketplaceOrder.Import(1, null, "shopify", Imported(), Now);
        Assert.True(o.Edit(MarketplaceRecipient.Empty with { Name = "Taro" }, 1, null, 1, null, null, null, null, null, Now));
        Assert.False(o.UpdateFrom(Imported("#1-moi"), Now));
        Assert.Equal("Taro", o.Recipient.Name);
    }
}
