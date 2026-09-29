using System.Text.Json;

namespace VietAnExpress.Shipments.Application.Dtos;

// Dạng dữ liệu khớp hợp đồng frontend — web/docs/API_CONTRACT.md §1, §2.

internal sealed record OrderPodDto(string Date, string Time, string Signer);

internal sealed record OrderEventDto(string Time, string Title, string? Location);

internal sealed record OrderDto(
    string Id,
    long Seq,
    string Bill,
    string Ref,
    string? Connect,
    string Cnee,
    string Ct,
    string Route,
    string Branch,
    string Created,
    string? Sent,
    string Type,
    string St,
    string Pcs,
    string Content,
    OrderPodDto? Pod,
    int Photos,
    string? PodEstimate,
    OrderShipperDto? Shipper = null,
    OrderReceiverDto? Receiver = null);

/// <summary>Người gửi / người nhận đầy đủ — chỉ trả ở GET /orders/{bill} (dùng cho "Nhân bản đơn"). Tên trường khớp form tạo đơn.</summary>
internal sealed record OrderShipperDto(string Company, string Contact, string Tel, string Address, string TaxId, string Email);

internal sealed record OrderReceiverDto(
    string Company, string Contact, string Tel, string Country, string City, string Postal, string State,
    string Addr1, string Addr2, string Addr3, string TaxId, string Email);

internal sealed record OrderSummaryDto(IReadOnlyDictionary<string, int> StatusCounts, int TotalPieces, decimal TotalWeight);

/// <summary>GET /orders — không bọc { success, data } vì frontend đọc thẳng các trường này.</summary>
internal sealed record OrderListResponse(
    IReadOnlyList<OrderDto> Items,
    int Total,
    int Page,
    int PageSize,
    int TotalPages,
    OrderSummaryDto Summary);

internal sealed record DraftDto(
    string Id,
    string Stt,
    string Cnee,
    string Ct,
    string Service,
    string Branch,
    string Ref,
    string Pcs,
    string Content,
    string Date,
    JsonElement? Payload);

/// <summary>POST /drafts/:id/print — frontend đọc message + billCode.</summary>
internal sealed record PrintDraftResponse(string Message, string BillCode)
{
    public bool Success => true;
}
