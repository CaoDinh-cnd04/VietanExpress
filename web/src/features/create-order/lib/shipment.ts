import { fill } from '@/shared/i18n';
import { RULES } from '../constants';
import type { CreateOrderValues, InvoiceItemValues, PackageValues } from '../schema';

/** Chuỗi ô nhập → số; rỗng / sai → 0. */
export const toNumber = (value: string | undefined): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

/** Trọng lượng quy đổi của một dòng kiện = D×R×C / 5000 × SL. */
export function volumetricWeight(p: Pick<PackageValues, 'qty' | 'length' | 'width' | 'height'>): number {
  const qty = Math.max(1, toNumber(p.qty));
  return round((toNumber(p.length) * toNumber(p.width) * toNumber(p.height) * qty) / RULES.volumetricDivisor);
}

export interface PackageSummary {
  pieces: number;
  grossWeight: number;
  volumetricWeight: number;
  /** Cân tính cước = max(cân thực, quy đổi). */
  chargeableWeight: number;
}

export function summarizePackages(packages: ReadonlyArray<PackageValues>): PackageSummary {
  const pieces = packages.reduce((s, p) => s + Math.max(0, toNumber(p.qty)), 0);
  const grossWeight = round(packages.reduce((s, p) => s + toNumber(p.weight) * Math.max(1, toNumber(p.qty)), 0));
  const volumetric = round(packages.reduce((s, p) => s + volumetricWeight(p), 0));
  return { pieces, grossWeight, volumetricWeight: volumetric, chargeableWeight: Math.max(grossWeight, volumetric) };
}

/** DocToPackRule: chứng từ vượt 2kg phải khai như hàng hóa. */
export const isDocOverweight = (type: 'DOC' | 'PACK', grossWeight: string): boolean =>
  type === 'DOC' && toNumber(grossWeight) > RULES.docMaxWeightKg;

export interface CargoTypeState {
  type: 'DOC' | 'PACK';
  /** PACK do hệ thống tự chuyển (chứng từ quá cân) — khác PACK do khách tự chọn. */
  autoConverted: boolean;
}

/**
 * Áp quy tắc DOC ↔ PACK theo cân nặng khai ở "Thông tin đơn hàng":
 * - Chứng từ > 2kg → tự chuyển PACK (đánh dấu autoConverted).
 * - PACK do hệ thống tự chuyển mà cân giảm về ≤ 2kg → trả lại chứng từ.
 * - PACK khách tự chọn thì giữ nguyên dù cân nhẹ.
 */
export function applyDocWeightRule(
  state: CargoTypeState,
  grossWeight: string
): CargoTypeState & { change: 'toPack' | 'toDoc' | null } {
  if (isDocOverweight(state.type, grossWeight)) return { type: 'PACK', autoConverted: true, change: 'toPack' };
  if (state.type === 'PACK' && state.autoConverted && toNumber(grossWeight) <= RULES.docMaxWeightKg)
    return { type: 'DOC', autoConverted: false, change: 'toDoc' };
  return { ...state, change: null };
}

export const lineTotal = (item: Pick<InvoiceItemValues, 'qty' | 'price'>): number => round(toNumber(item.qty) * toNumber(item.price));

export const invoiceTotal = (items: ReadonlyArray<InvoiceItemValues>): number => round(items.reduce((s, it) => s + lineTotal(it), 0));

/** Dữ liệu gửi POST /drafts. 'ready' = đã khai đủ, chờ in; 'draft' = lưu nháp dở. */
export function buildDraftPayload(v: CreateOrderValues, status: 'draft' | 'ready') {
  const isPack = v.shipment.type === 'PACK';
  const weight = isPack ? summarizePackages(v.packages).chargeableWeight || toNumber(v.shipment.grossWeight) : toNumber(v.shipment.grossWeight);
  return {
    stt: status,
    cnee: v.receiver.company || '(Chưa đặt tên)',
    ct: v.receiver.country || '—',
    service: v.service.hub || v.service.carrier || '—',
    branch: v.shipper.branch,
    ref: v.service.reference,
    pcs: fill('{pcs} kiện · {kg} kg', { pcs: toNumber(v.shipment.pieces) || 1, kg: weight }),
    content: isPack ? v.goods.description || 'Hàng hóa' : v.goods.docContent || 'Chứng từ',
    payload: v as unknown as Record<string, unknown>
  };
}
