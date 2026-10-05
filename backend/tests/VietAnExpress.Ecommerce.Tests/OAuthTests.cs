using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using VietAnExpress.Ecommerce.Infrastructure;
using VietAnExpress.Ecommerce.Infrastructure.Shopify;
using Xunit;

namespace VietAnExpress.Ecommerce.Tests;

public class ShopifyOAuthTests
{
    [Theory]
    [InlineData("my-shop", "my-shop.myshopify.com")]
    [InlineData(" My-Shop.myshopify.com ", "my-shop.myshopify.com")]
    [InlineData("https://my-shop.myshopify.com/admin", "my-shop.myshopify.com")]
    [InlineData("admin.shopify.com/store/my-shop", "my-shop.myshopify.com")]
    [InlineData("evil.com", null)]
    [InlineData("my-shop.myshopify.com.evil.com", null)]
    [InlineData("-shop", null)]
    [InlineData("", null)]
    public void NormalizeShop_chi_nhan_ten_myshopify(string input, string? expected) =>
        Assert.Equal(expected, ShopifyOAuth.NormalizeShop(input));

    // Ví dụ trong tài liệu Shopify (secret "hush").
    private static readonly List<KeyValuePair<string, string>> DocExample =
    [
        new("code", "0907a61c0c8d55e99db179b68161bc00"),
        new("hmac", "700e2dadb827fcc8609e9d5ce208b2e9cdaab9df07390d2cbca10d7c328fc4bf"),
        new("shop", "some-shop.myshopify.com"),
        new("state", "0.6784241404160823"),
        new("timestamp", "1337178173")
    ];

    [Fact]
    public void IsValidHmac_dung_vi_du_cua_Shopify() => Assert.True(ShopifyOAuth.IsValidHmac(DocExample, "hush"));

    [Fact]
    public void IsValidHmac_sai_khi_doi_tham_so_hoac_secret()
    {
        var tampered = DocExample.Select(p => p.Key == "shop" ? new KeyValuePair<string, string>("shop", "other.myshopify.com") : p).ToList();
        Assert.False(ShopifyOAuth.IsValidHmac(tampered, "hush"));
        Assert.False(ShopifyOAuth.IsValidHmac(DocExample, "wrong"));
        Assert.False(ShopifyOAuth.IsValidHmac(DocExample.Where(p => p.Key != "hmac"), "hush"));
    }

    [Fact]
    public void AuthorizeUrl_ma_hoa_tham_so()
    {
        var url = ShopifyOAuth.AuthorizeUrl("a.myshopify.com", "id", "read_orders,write_x", "https://p.app/cb", "s.t");
        Assert.Equal("https://a.myshopify.com/admin/oauth/authorize?client_id=id&scope=read_orders%2Cwrite_x&redirect_uri=https%3A%2F%2Fp.app%2Fcb&state=s.t", url);
    }
}

public class OAuthStateTests
{
    private static readonly byte[] Key = Enumerable.Range(1, 32).Select(i => (byte)i).ToArray();
    private static readonly DateTimeOffset Now = new(2026, 10, 5, 8, 0, 0, TimeSpan.Zero);
    private static readonly OAuthStatePayload Payload = new(42, "shopify", "a.myshopify.com", "vietan-express.vercel.app", Now.AddMinutes(10), "n1");

    [Fact]
    public void Protect_roi_Unprotect_tra_lai_noi_dung() =>
        Assert.Equal(Payload with { ExpiresAt = DateTimeOffset.FromUnixTimeSeconds(Payload.ExpiresAt.ToUnixTimeSeconds()) },
            OAuthState.Unprotect(OAuthState.Protect(Payload, Key), Key, Now));

    [Fact]
    public void Unprotect_tu_choi_state_het_han_sai_khoa_hoac_bi_sua()
    {
        var state = OAuthState.Protect(Payload, Key);
        Assert.Null(OAuthState.Unprotect(state, Key, Now.AddMinutes(11)));
        Assert.Null(OAuthState.Unprotect(state, [.. Key.Reverse()], Now));
        var forged = OAuthState.Protect(Payload with { CustomerId = 7 }, [.. Key.Reverse()]).Split('.')[0] + "." + state.Split('.')[1];
        Assert.Null(OAuthState.Unprotect(forged, Key, Now));
        Assert.Null(OAuthState.Unprotect("khong-hop-le", Key, Now));
        Assert.Null(OAuthState.Unprotect(null, Key, Now));
    }
}

public class TokenProtectorTests
{
    private static TokenProtector Create(string key) => new(Options.Create(new EcommerceOptions { TokenEncryptionKey = key }));

    [Fact]
    public void Ma_hoa_roi_giai_ma_dung_va_moi_lan_khac_nhau()
    {
        var p = Create(Convert.ToBase64String(new byte[32]));
        var a = p.Protect("shpat_secret");
        Assert.StartsWith("v1:", a);
        Assert.DoesNotContain("shpat_secret", a);
        Assert.NotEqual(a, p.Protect("shpat_secret"));
        Assert.Equal("shpat_secret", p.Unprotect(a));
    }

    [Theory]
    [InlineData("")]
    [InlineData("khong-phai-base64")]
    [InlineData("AAAA")]
    public void Khoa_sai_thi_chua_cau_hinh(string key) => Assert.False(Create(key).IsConfigured);
}

public class PortalHostsTests
{
    private static PortalHosts Create(bool development)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Company:PortalUrl"] = "https://viet-an-express.vercel.app",
            ["Cors:AllowedOrigins:0"] = "https://vietan-express.vercel.app"
        }).Build();
        return new PortalHosts(config, new Env(development ? Environments.Development : Environments.Production));
    }

    [Fact]
    public void Resolve_nhan_domain_trong_danh_sach_con_lai_ve_mac_dinh()
    {
        var hosts = Create(development: false);
        Assert.Equal("vietan-express.vercel.app", hosts.Resolve("vietan-express.vercel.app", "x.onrender.com"));
        Assert.Equal("viet-an-express.vercel.app", hosts.Resolve("evil.com", null));
        Assert.Equal("viet-an-express.vercel.app", hosts.Resolve(null, "localhost:5173"));
    }

    [Fact]
    public void Localhost_chi_hop_le_khi_dev()
    {
        Assert.Equal("localhost:5173", Create(development: true).Resolve(null, "localhost:5173"));
        Assert.Equal("http://localhost:5173/x", PortalHosts.Url("localhost:5173", "/x"));
        Assert.Equal("https://a.app/x", PortalHosts.Url("a.app", "/x"));
    }

    private sealed class Env(string name) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = name;
        public string ApplicationName { get; set; } = "test";
        public string ContentRootPath { get; set; } = "";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
