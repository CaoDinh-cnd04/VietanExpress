using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace VietAnExpress.Shipments.Infrastructure.Legacy;

/// <summary>
/// 1 dòng của bảng vận đơn hệ thống cũ <c>dbo.MaVanDon</c> — nguồn chính của "Đơn hàng của tôi" và nơi ghi đơn tạo mới,
/// vì hệ thống cũ (kho, vận hành) vẫn chạy song song trên bảng này.
/// Bảng do hệ thống cũ sở hữu: KHÔNG nằm trong migration, không đổi cấu trúc từ phía portal.
/// </summary>
internal sealed class LegacyOrder
{
    public long Id { get; set; }
    /// <summary>CustomerID của dbo.TCustomer (mã khách hệ thống cũ).</summary>
    public long? CustomerId { get; set; }
    public string? Awb { get; set; }

    public string? SenderName { get; set; }
    public string? SenderAddress { get; set; }
    public int? SenderCountryId { get; set; }
    public string? SenderPostalCode { get; set; }
    public string? SenderContactName { get; set; }
    public string? SenderPhone { get; set; }
    public string? SenderEmail { get; set; }
    public string? SenderTax { get; set; }

    public string? ConsigneeName { get; set; }
    public string? ConsigneeAddress1 { get; set; }
    public string? ConsigneeAddress2 { get; set; }
    public string? ConsigneeAddress3 { get; set; }
    public string? ConsigneeCity { get; set; }
    public string? ConsigneeState { get; set; }
    public int? ConsigneeCountryId { get; set; }
    public string? ConsigneeCountry { get; set; }
    public string? ConsigneePostalCode { get; set; }
    public string? ConsigneeContactName { get; set; }
    public string? ConsigneePhone { get; set; }
    /// <summary>Cột NOT NULL ở hệ thống cũ — không có thì ghi chuỗi rỗng.</summary>
    public string ConsigneeEmail { get; set; } = string.Empty;
    public string? ConsigneeVatTax { get; set; }
    public string? ConsigneePhoneCode { get; set; }
    public string? ConsigneeIossNo { get; set; }
    public string? ConsigneeEoriNo { get; set; }

    public int? Service { get; set; }
    public int? Status { get; set; }
    public DateTime? CreateDate { get; set; }
    public DateTime? ModifyDate { get; set; }
    public int? CreateUser { get; set; }
    public int? ModifyUser { get; set; }

    /// <summary>Tên hàng (Ten_hang).</summary>
    public string? GoodsName { get; set; }
    /// <summary>Số kiện (So_Kien).</summary>
    public int? Pieces { get; set; }
    /// <summary>Cân tính cước, kg (Trong_Luong).</summary>
    public decimal? WeightKg { get; set; }
    /// <summary>Giá trị hàng khai báo (Gia_Tri_Hang).</summary>
    public decimal? GoodsValue { get; set; }
    /// <summary>Số vận đơn Việt An (VA bill) — khách tra cứu bằng số này.</summary>
    public long? OrderNumber { get; set; }
    public string? CustomerName { get; set; }
    /// <summary>Mã vận đơn của hãng / đối tác chặng cuối (Bill_Connect).</summary>
    public string? BillConnect { get; set; }
    /// <summary>Dịch vụ dạng "DHL|Singapore" (Dich_Vu).</summary>
    public string? ServiceName { get; set; }
    /// <summary>Lý do xuất hàng: GIFT, SAMPLE… (Ly_Do_Xuat_Hang).</summary>
    public string? ExportReason { get; set; }
    public DateTime? SentDate { get; set; }
    /// <summary>Kết quả giao dạng chữ, vd "08/01/2026 16:28, DELIVERED LYNN TAN".</summary>
    public string? Pod { get; set; }
    public DateTime? PodEstimate { get; set; }
    public long? CustomerStaffId { get; set; }
    /// <summary>Loại tiền của giá trị hàng (Loai_Tien).</summary>
    public string? Currency { get; set; }
    public decimal? ShippingFee { get; set; }
    /// <summary>Mã tham chiếu / bill riêng của khách.</summary>
    public string? CustomerBill { get; set; }
    /// <summary>Tên shipper gốc — khách là đơn vị forwarder gửi hộ (Ten_Khach_Cua_FWD).</summary>
    public string? ForwarderShipperName { get; set; }
}

internal sealed class LegacyOrderConfiguration : IEntityTypeConfiguration<LegacyOrder>
{
    public void Configure(EntityTypeBuilder<LegacyOrder> b)
    {
        b.ToTable("MaVanDon", "dbo", t => t.ExcludeFromMigrations());
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).HasColumnName("ID").ValueGeneratedOnAdd();
        b.Property(x => x.CustomerId).HasColumnName("CustomerID");
        b.Property(x => x.Awb).HasColumnName("AWB").HasMaxLength(20);

        b.Property(x => x.SenderName).HasMaxLength(250);
        b.Property(x => x.SenderAddress).HasMaxLength(500);
        b.Property(x => x.SenderCountryId).HasColumnName("SenderCountryID");
        b.Property(x => x.SenderPostalCode).HasMaxLength(50);
        b.Property(x => x.SenderContactName).HasMaxLength(100);
        b.Property(x => x.SenderPhone).HasMaxLength(50);
        b.Property(x => x.SenderEmail).HasMaxLength(150);
        b.Property(x => x.SenderTax).HasMaxLength(100);

        b.Property(x => x.ConsigneeName).HasMaxLength(250);
        b.Property(x => x.ConsigneeAddress1).HasMaxLength(250);
        b.Property(x => x.ConsigneeAddress2).HasMaxLength(250);
        b.Property(x => x.ConsigneeAddress3).HasMaxLength(250);
        b.Property(x => x.ConsigneeCity).HasMaxLength(50);
        b.Property(x => x.ConsigneeState).HasMaxLength(50);
        b.Property(x => x.ConsigneeCountryId).HasColumnName("ConsigneeCountryID");
        b.Property(x => x.ConsigneeCountry).HasMaxLength(50);
        b.Property(x => x.ConsigneePostalCode).HasMaxLength(50);
        b.Property(x => x.ConsigneeContactName).HasMaxLength(100);
        b.Property(x => x.ConsigneePhone).HasMaxLength(50);
        b.Property(x => x.ConsigneeEmail).HasMaxLength(150).IsRequired();
        b.Property(x => x.ConsigneeVatTax).HasColumnName("CONSIGNEE_VAT_Tax").HasMaxLength(100);
        b.Property(x => x.ConsigneePhoneCode).HasMaxLength(50);
        b.Property(x => x.ConsigneeIossNo).HasMaxLength(12);
        b.Property(x => x.ConsigneeEoriNo).HasMaxLength(17);

        b.Property(x => x.CreateDate).HasColumnType("date");
        b.Property(x => x.ModifyDate).HasColumnType("date");

        b.Property(x => x.GoodsName).HasColumnName("Ten_hang").HasMaxLength(150);
        b.Property(x => x.Pieces).HasColumnName("So_Kien");
        b.Property(x => x.WeightKg).HasColumnName("Trong_Luong").HasPrecision(18, 2);
        b.Property(x => x.GoodsValue).HasColumnName("Gia_Tri_Hang").HasPrecision(18, 2);
        b.Property(x => x.CustomerName).HasMaxLength(250);
        b.Property(x => x.BillConnect).HasColumnName("Bill_Connect").HasMaxLength(50);
        b.Property(x => x.ServiceName).HasColumnName("Dich_Vu").HasMaxLength(50);
        b.Property(x => x.ExportReason).HasColumnName("Ly_Do_Xuat_Hang").HasMaxLength(150);
        b.Property(x => x.SentDate).HasColumnName("Sent_Date").HasColumnType("datetime");
        b.Property(x => x.Pod).HasColumnName("POD").HasMaxLength(500);
        b.Property(x => x.PodEstimate).HasColumnName("POD_Est").HasColumnType("datetime");
        b.Property(x => x.CustomerStaffId).HasColumnName("Customer_Staff_ID");
        b.Property(x => x.Currency).HasColumnName("Loai_Tien").HasMaxLength(50);
        b.Property(x => x.ShippingFee).HasPrecision(18, 4);
        b.Property(x => x.CustomerBill).HasMaxLength(50);
        b.Property(x => x.ForwarderShipperName).HasColumnName("Ten_Khach_Cua_FWD").HasMaxLength(150);
    }
}
