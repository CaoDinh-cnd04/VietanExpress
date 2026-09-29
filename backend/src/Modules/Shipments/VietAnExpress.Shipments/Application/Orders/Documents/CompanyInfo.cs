namespace VietAnExpress.Shipments.Application.Orders.Documents;

/// <summary>
/// Thông tin công ty in trên bill, invoice, công văn (section "Company" trong appsettings).
/// Mặc định lấy theo trang tracking hiện tại của Việt An.
/// </summary>
internal sealed class CompanyInfo
{
    public const string Section = "Company";

    public string Name { get; init; } = "Công ty TNHH Dịch vụ Giao nhận Quốc tế Việt An";
    public string EnglishName { get; init; } = "Viet An Express International Co., Ltd";
    public string Address { get; init; } = "14 Sâm Sơn, Phường 4, Quận Tân Bình, TP. Hồ Chí Minh";
    public string Phone { get; init; } = "0909 805 845";
    public string Hotline { get; init; } = "028 3948 3949";
    public string Website { get; init; } = "vietanexpress.com.vn";
    public string TaxCode { get; init; } = "0310278855";
}
