namespace VietAnExpress.Shipments.Contracts;

public static class ShipmentsPermissions
{
    public const string View = "shipments.view";
    public const string Create = "shipments.create";
    public const string Update = "shipments.update";
    public const string IssueBill = "shipments.issue-bill";
    /// <summary>Tài khoản con xem được mọi đơn của công ty; không có thì chỉ thấy đơn mình tạo. Tài khoản chính luôn thấy tất cả.</summary>
    public const string ViewAll = "shipments.view-all";
}
