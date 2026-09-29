using System.Globalization;
using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using VietAnExpress.SharedKernel.Application;
using VietAnExpress.SharedKernel.Results;
using VietAnExpress.Shipments.Application.Dtos;
using VietAnExpress.Shipments.Domain;
using VietAnExpress.Shipments.Infrastructure;

namespace VietAnExpress.Shipments.Application.Orders;

/// <summary>Body POST / PUT /drafts — khớp NewDraft của frontend (web/src/features/drafts/api.ts).</summary>
internal sealed record DraftInput(
    string Stt,
    string? Cnee,
    string? Ct,
    string? Service,
    string? Branch,
    string? Ref,
    string? Pcs,
    string? Content,
    JsonElement? Payload)
{
    public OrderDraftSummary ToSummary() => new(
        Stt, Cnee ?? "", Ct ?? "", Service ?? "", Branch ?? "", Ref ?? "", Pcs ?? "", Content ?? "");

    public string PayloadJson => Payload is { ValueKind: JsonValueKind.Object } p ? p.GetRawText() : "{}";
}

internal static class DraftScope
{
    /// <summary>Khách thấy nháp của khách mình; nhân viên thấy nháp do chính mình tạo.</summary>
    public static IQueryable<OrderDraft> VisibleTo(this IQueryable<OrderDraft> query, ICurrentUser user) =>
        user.CustomerId is { } customerId
            ? query.Where(d => d.CustomerId == customerId)
            : query.Where(d => d.CustomerId == null && d.CreatedBy == user.UserId);

    public static DraftDto ToDto(OrderDraft d) => new(
        d.Id.ToString(), d.Status, d.Consignee, d.Country, d.ServiceName, d.Branch, d.Reference, d.PiecesText, d.Content,
        VietnamTime.ToVietnam(d.UpdatedAt ?? d.CreatedAt).ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture),
        JsonDocument.Parse(d.PayloadJson).RootElement.Clone());
}

// ---------- Danh sách / lưu / sửa / xoá nháp ----------

internal sealed record GetDraftsQuery : IRequest<IReadOnlyList<DraftDto>>;

internal sealed record SaveDraftCommand(Guid? Id, DraftInput Draft) : IRequest<Result<DraftDto>>;

internal sealed record DeleteDraftCommand(Guid Id) : IRequest<Result>;

internal sealed class DraftHandlers(ShipmentsDbContext db, ICurrentUser user) :
    IRequestHandler<GetDraftsQuery, IReadOnlyList<DraftDto>>,
    IRequestHandler<SaveDraftCommand, Result<DraftDto>>,
    IRequestHandler<DeleteDraftCommand, Result>
{
    public async Task<IReadOnlyList<DraftDto>> Handle(GetDraftsQuery q, CancellationToken ct)
    {
        var drafts = await db.OrderDrafts.AsNoTracking().VisibleTo(user)
            .OrderByDescending(d => d.UpdatedAt ?? d.CreatedAt)
            .ToListAsync(ct);
        return drafts.Select(DraftScope.ToDto).ToList();
    }

    public async Task<Result<DraftDto>> Handle(SaveDraftCommand cmd, CancellationToken ct)
    {
        OrderDraft? draft;
        if (cmd.Id is { } id)
        {
            draft = await db.OrderDrafts.VisibleTo(user).FirstOrDefaultAsync(d => d.Id == id, ct);
            if (draft is null) return OrderErrors.DraftNotFound;
            draft.Update(cmd.Draft.ToSummary(), cmd.Draft.PayloadJson);
        }
        else
        {
            draft = new OrderDraft(user.CustomerId, cmd.Draft.ToSummary(), cmd.Draft.PayloadJson);
            db.OrderDrafts.Add(draft);
        }
        await db.SaveChangesAsync(ct);
        return DraftScope.ToDto(draft);
    }

    public async Task<Result> Handle(DeleteDraftCommand cmd, CancellationToken ct)
    {
        var draft = await db.OrderDrafts.VisibleTo(user).FirstOrDefaultAsync(d => d.Id == cmd.Id, ct);
        if (draft is null) return OrderErrors.DraftNotFound;
        db.OrderDrafts.Remove(draft); // xoá mềm
        await db.SaveChangesAsync(ct);
        return Result.Success();
    }
}

// ---------- In & cấp bill: ghi đơn vào dbo.MaVanDon ----------

internal sealed record PrintDraftCommand(Guid Id) : IRequest<Result<PrintDraftResponse>>;

internal sealed class PrintDraftHandler(
    ShipmentsDbContext db, ICurrentUser user, OrderAccess access, ILegacyOrderNumberAllocator numbers, TimeProvider clock)
    : IRequestHandler<PrintDraftCommand, Result<PrintDraftResponse>>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task<Result<PrintDraftResponse>> Handle(PrintDraftCommand cmd, CancellationToken ct)
    {
        var draft = await db.OrderDrafts.VisibleTo(user).FirstOrDefaultAsync(d => d.Id == cmd.Id, ct);
        if (draft is null) return OrderErrors.DraftNotFound;
        if (!draft.IsReady) return OrderErrors.DraftNotReady;

        OrderPayload? payload;
        try { payload = JsonSerializer.Deserialize<OrderPayload>(draft.PayloadJson, Json); }
        catch (JsonException) { payload = null; }
        if (payload is null || string.IsNullOrWhiteSpace(payload.Receiver.Company)) return OrderErrors.InvalidPayload;

        var writer = await access.WriterAsync(ct);
        if (writer.IsFailure) return writer.Error;

        var number = await numbers.NextAsync(ct);
        var today = VietnamTime.ToVietnam(clock.GetUtcNow()).Date;
        db.LegacyOrders.Add(LegacyOrderFactory.FromPayload(payload, writer.Value, number, today));
        draft.MarkPrinted(number);
        db.OrderDrafts.Remove(draft); // xoá mềm — vẫn giữ form để in invoice

        // 1 lần SaveChanges = 1 transaction: ghi đơn vào MaVanDon và xoá nháp cùng thành công hoặc cùng huỷ.
        await db.SaveChangesAsync(ct);
        var bill = number.ToString(CultureInfo.InvariantCulture);
        return new PrintDraftResponse($"Đã cấp mã vận đơn {bill}", bill);
    }
}
