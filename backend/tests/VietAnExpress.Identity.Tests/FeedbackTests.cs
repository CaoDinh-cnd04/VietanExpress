using VietAnExpress.Identity.Application.Commands;
using VietAnExpress.Identity.Domain;
using Xunit;

namespace VietAnExpress.Identity.Tests;

public class FeedbackTests
{
    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0, 1];
    private static readonly byte[] Jpg = [0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0];

    private static FeedbackUpload Image(byte[] data, string type = "image/png") => new("a.png", type, data);

    [Fact]
    public void Gop_y_hop_le()
    {
        Assert.Null(FeedbackRules.Validate("Giao hàng chậm", null, null, []));
        Assert.Null(FeedbackRules.Validate("Ảnh lỗi", "0909", 4, [Image(Png), Image(Jpg, "image/jpeg")]));
    }

    [Fact]
    public void Tu_choi_noi_dung_trong_qua_dai_va_qua_nhieu_anh()
    {
        Assert.Equal(FeedbackErrors.Empty, FeedbackRules.Validate("   ", null, null, []));
        Assert.Equal(FeedbackErrors.TooLong, FeedbackRules.Validate(new string('a', Feedback.MessageMaxLength + 1), null, null, []));
        Assert.Equal(FeedbackErrors.TooManyImages, FeedbackRules.Validate("x", null, null, Enumerable.Repeat(Image(Png), 6).ToList()));
    }

    [Fact]
    public void Chi_nhan_anh_that_khong_tin_loai_file_khai()
    {
        Assert.Equal(FeedbackErrors.ImageType, FeedbackRules.Validate("x", null, null, [Image("<script>alert(1)</script>"u8.ToArray())]));
        Assert.Equal(FeedbackErrors.ImageType, FeedbackRules.Validate("x", null, null, [Image(Png, "application/pdf")]));
        Assert.Equal(FeedbackErrors.ImageTooLarge,
            FeedbackRules.Validate("x", null, null, [Image([.. Png, .. new byte[Feedback.ImageMaxBytes]])]));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void So_sao_ngoai_1_den_5_bi_tu_choi(int rating) => Assert.Equal(FeedbackErrors.Rating, FeedbackRules.Validate("x", null, rating, []));

    [Fact]
    public void So_sao_khong_bat_buoc() => Assert.Null(FeedbackRules.Validate("x", null, null, []));

    [Fact]
    public void Ten_file_bo_duong_dan() => Assert.Equal("anh.png", FeedbackRules.SafeFileName(@"C:\Users\x\..\anh.png"));

    [Fact]
    public void Admin_sai_ten_hoac_mat_khau_bi_tu_choi()
    {
        Assert.False(VietAnAdminAccount.Verify(VietAnAdminAccount.UserName, "sai-mat-khau"));
        Assert.False(VietAnAdminAccount.Verify("khach", "bat-ky"));
        Assert.False(VietAnAdminAccount.Verify(VietAnAdminAccount.UserName, ""));
    }

    [Fact]
    public void Danh_dau_da_xem_mot_lan()
    {
        var f = Feedback.Create(1, "KH1", "ABC", null, "abc", "x", null, 5, [], new DateTime(2026, 10, 9));
        Assert.True(f.MarkSeen(new DateTime(2026, 10, 10)));
        Assert.False(f.MarkSeen(new DateTime(2026, 10, 11)));
        Assert.Equal(new DateTime(2026, 10, 10), f.SeenAt);
    }
}
