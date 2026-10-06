using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
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

    public string PayloadJson
    {
        get
        {
            if (Payload is not { ValueKind: JsonValueKind.Object } p) return "{}";
            var node = JsonNode.Parse(p.GetRawText())!;
            if (node["receiver"] is JsonObject receiver)
            {
                var country = receiver["country"] is JsonValue cv && cv.TryGetValue<string>(out var c) ? c : "";
                var code = receiver["countryCode"] is JsonValue cc && cc.TryGetValue<string>(out var iso) ? iso : "";
                if (!EuCountries.IsEuCountry(EuCountries.ReceiverCode(country, code)))
                {
                    receiver["iossNo"] = "";
                    receiver["eoriNo"] = "";
                }
            }
            return node.ToJsonString();
        }
    }
}

internal static class DraftScope
{
    /// <summary>Khách chỉ thấy nháp của mình.</summary>
    public static IQueryable<OrderDraft> VisibleTo(this IQueryable<OrderDraft> query, ICurrentUser user)
    {
        if (user.CustomerId is not { } customerId) return query.Where(_ => false);
        query = query.Where(d => d.CustomerId == customerId);
        return user.OwnOrdersOnly() && user.StaffId is { } staffId ? query.Where(d => d.CreatedByStaffId == staffId) : query;
    }

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
            if (user.CustomerId is not { } customerId) return OrderErrors.CustomerRequired;
            draft = new OrderDraft(customerId, cmd.Draft.ToSummary(), cmd.Draft.PayloadJson, user.StaffId);
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
        var taxValidation = new Validators.ReceiverTaxValidator().Validate(payload.Receiver);
        if (!taxValidation.IsValid)
            return Error.Validation("RECEIVER_TAX_INVALID", taxValidation.Errors[0].ErrorMessage);

        var writer = await access.WriterAsync(ct);
        if (writer.IsFailure) return writer.Error;

        var number = await numbers.NextAsync(ct);
        var today = VietnamTime.ToVietnam(clock.GetUtcNow()).Date;

        // 1 transaction: ghi MaVanDon + chi tiết kiện / dòng hàng và xoá nháp cùng thành công hoặc cùng huỷ.
        await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var order = LegacyOrderFactory.FromPayload(payload, writer.Value, number, today);
            db.LegacyOrders.Add(order);
            db.OrderDrafts.Attach(draft);
            draft.MarkPrinted(number);
            db.OrderDrafts.Remove(draft); // xoá mềm — vẫn giữ form để mở lại / nhân bản
            await db.SaveChangesAsync(ct);
            await LegacyOrderLinesWriter.AddAsync(db, [(order, payload)], ct);
            // Đơn thuộc người tạo nháp (vd nhân viên tạo, admin in hộ thì vẫn là đơn của nhân viên đó).
            OrderAccess.RecordCreators(db, [order], draft.CreatedByStaffId, VietnamTime.ToVietnam(clock.GetUtcNow()).DateTime);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        });
        var bill = number.ToString(CultureInfo.InvariantCulture);
        return new PrintDraftResponse($"Đã cấp mã vận đơn {bill}", bill);
    }
}
