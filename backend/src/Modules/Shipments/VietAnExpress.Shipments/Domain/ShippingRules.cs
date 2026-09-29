namespace VietAnExpress.Shipments.Domain;

/// <summary>
/// Quy tắc tính cân — PHẢI khớp frontend (web/src/features/create-order/constants.ts, RULES).
/// Đổi ở đây thì đổi cả frontend.
/// </summary>
internal static class ShippingRules
{
    /// <summary>Hệ số quy đổi thể tích: cân quy đổi (kg) = D × R × C (cm) / 5000.</summary>
    public const decimal VolumetricDivisor = 5000m;

    /// <summary>Chứng từ nặng hơn mức này tự chuyển thành hàng hoá (hãng không nhận DOC quá 2kg).</summary>
    public const decimal DocumentMaxWeightKg = 2m;

    public const int MaxPackageLines = 100;

    public static decimal Round(decimal kg) => decimal.Round(kg, 2, MidpointRounding.AwayFromZero);

    /// <summary>Cân tính cước = max(cân thực, cân quy đổi).</summary>
    public static decimal ChargeableWeight(decimal actualKg, decimal volumetricKg) => Math.Max(actualKg, volumetricKg);
}
