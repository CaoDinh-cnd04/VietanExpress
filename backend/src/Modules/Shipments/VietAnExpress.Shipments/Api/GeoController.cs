using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using VietAnExpress.SharedKernel.Results;
using VietAnExpress.SharedKernel.Web;
using VietAnExpress.Shipments.Infrastructure.Geo;

namespace VietAnExpress.Shipments.Api;

/// <summary>Tra cứu địa lý khi khai địa chỉ người nhận: quốc gia + mã điện thoại, mã bưu chính → thành phố / tỉnh bang, gợi ý địa chỉ.</summary>
[ApiVersion(1)]
[Route("api/v{version:apiVersion}/geo")]
[Tags("Địa lý")]
[Authorize]
internal sealed class GeoController(IGeoLookup geo) : ApiControllerBase
{
    /// <summary>Danh sách quốc gia (tên tiếng Anh, mã ISO, mã điện thoại).</summary>
    [HttpGet("countries")]
    [ResponseCache(Duration = 86400, Location = ResponseCacheLocation.Client)]
    [ProducesResponseType<ApiResponse<IReadOnlyList<CountryInfo>>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Countries(CancellationToken ct) => OkData(await geo.GetCountriesAsync(ct));

    /// <summary>Mã bưu chính → thành phố, tỉnh / bang. 404 khi không tìm thấy hoặc nước chưa hỗ trợ.</summary>
    [HttpGet("postal/{countryCode}/{postalCode}")]
    [ProducesResponseType<ApiResponse<PostalInfo>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Postal(string countryCode, string postalCode, CancellationToken ct) =>
        await geo.LookupPostalAsync(countryCode, postalCode, ct) is { } info
            ? OkData(info)
            : Problem(Error.NotFound("POSTAL_NOT_FOUND", "Không tìm thấy mã bưu chính"));

    /// <summary>Gợi ý địa chỉ trong nước <c>country</c> theo chữ khách gõ (<c>q</c> ≥ 3 ký tự) — tối đa 6 dòng, rỗng khi không có.</summary>
    [HttpGet("addresses")]
    [ProducesResponseType<ApiResponse<IReadOnlyList<AddressSuggestion>>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Addresses([FromQuery] string? country, [FromQuery] string? q, CancellationToken ct) =>
        OkData(await geo.SuggestAddressesAsync(country ?? "", q ?? "", ct));
}
