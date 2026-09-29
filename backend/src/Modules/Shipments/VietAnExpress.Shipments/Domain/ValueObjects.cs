using VietAnExpress.SharedKernel.Exceptions;

namespace VietAnExpress.Shipments.Domain;

/// <summary>Địa chỉ người gửi / người nhận. Bất biến: muốn đổi thì tạo địa chỉ mới.</summary>
internal sealed record Address
{
    private Address() { } // EF Core

    public Address(
        string contactName,
        string phone,
        string line1,
        string? line2,
        string city,
        string? state,
        string? postalCode,
        string countryCode,
        string? companyName = null,
        string? email = null)
    {
        ContactName = Required(contactName, "tên liên hệ");
        Phone = Required(phone, "số điện thoại");
        Line1 = Required(line1, "địa chỉ");
        Line2 = Optional(line2);
        City = Required(city, "thành phố");
        State = Optional(state);
        PostalCode = Optional(postalCode);
        CompanyName = Optional(companyName);
        Email = Optional(email);

        var country = Required(countryCode, "mã quốc gia").ToUpperInvariant();
        if (country.Length != 2 || !country.All(char.IsAsciiLetterUpper))
            throw new DomainException("ADDRESS_INVALID_COUNTRY", $"Mã quốc gia '{countryCode}' không hợp lệ (ISO 2 ký tự, vd VN, US)");
        CountryCode = country;
    }

    public string ContactName { get; private init; } = null!;
    public string? CompanyName { get; private init; }
    public string Phone { get; private init; } = null!;
    public string? Email { get; private init; }
    public string Line1 { get; private init; } = null!;
    public string? Line2 { get; private init; }
    public string City { get; private init; } = null!;
    public string? State { get; private init; }
    public string? PostalCode { get; private init; }
    /// <summary>ISO 3166-1 alpha-2, viết hoa.</summary>
    public string CountryCode { get; private init; } = null!;

    private static string Required(string? value, string field) =>
        string.IsNullOrWhiteSpace(value)
            ? throw new DomainException("ADDRESS_MISSING_FIELD", $"Địa chỉ thiếu {field}")
            : value.Trim();

    private static string? Optional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

/// <summary>Số tiền kèm loại tiền (ISO 4217). Không âm.</summary>
internal sealed record Money
{
    private Money() { } // EF Core

    public Money(decimal amount, string currency)
    {
        if (amount < 0)
            throw new DomainException("MONEY_NEGATIVE", "Số tiền không được âm");

        var code = (currency ?? string.Empty).Trim().ToUpperInvariant();
        if (code.Length != 3 || !code.All(char.IsAsciiLetterUpper))
            throw new DomainException("MONEY_INVALID_CURRENCY", $"Loại tiền '{currency}' không hợp lệ (vd USD, VND)");

        Amount = decimal.Round(amount, 2, MidpointRounding.AwayFromZero);
        Currency = code;
    }

    public decimal Amount { get; private init; }
    public string Currency { get; private init; } = null!;

    public static Money Zero(string currency = "USD") => new(0, currency);
}
