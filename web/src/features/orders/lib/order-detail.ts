import type { OrderInvoiceItem, OrderPackage, OrderReceiver } from '../types';

/** Cân quy đổi = D×R×C / 5000 (cm → kg) — cùng quy tắc với tạo đơn. */
export const VOLUME_DIVISOR = 5000;

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface PackageSummary {
  pieces: number;
  /** Tổng cân thực (kg). */
  gross: number;
  /** Tổng cân quy đổi (kg). */
  volume: number;
  /** Cân tính cước = max(thực, quy đổi). */
  chargeable: number;
}

/** Cân quy đổi của cả dòng kiện (SL × D×R×C / 5000). */
export function lineVolume(p: OrderPackage): number {
  return round2((p.qty * p.length * p.width * p.height) / VOLUME_DIVISOR);
}

export function summarizePackages(list: readonly OrderPackage[]): PackageSummary {
  const pieces = list.reduce((s, p) => s + p.qty, 0);
  const gross = round2(list.reduce((s, p) => s + p.qty * p.weightKg, 0));
  const volume = round2(list.reduce((s, p) => s + lineVolume(p), 0));
  return { pieces, gross, volume, chargeable: Math.max(gross, volume) };
}

export function invoiceTotal(items: readonly OrderInvoiceItem[]): number {
  return round2(items.reduce((s, i) => s + (i.amount || i.qty * i.price), 0));
}

/** Địa chỉ người nhận thành các dòng hiển thị, bỏ dòng trống. */
export function receiverAddress(r: OrderReceiver): string[] {
  const cityLine = [r.city, r.state, r.postal].map(s => s.trim()).filter(Boolean).join(', ');
  return [r.addr1, r.addr2, r.addr3, cityLine, r.country].map(s => s.trim()).filter(Boolean);
}

/** Bỏ các cặp [nhãn, giá trị] có giá trị trống / "—" để khung chi tiết gọn. */
export function filledRows<T extends readonly [string, string | null | undefined]>(rows: readonly T[]): Array<[string, string]> {
  return rows.filter(([, v]) => !!v && v.trim() !== '' && v.trim() !== '—').map(([k, v]) => [k, v!.trim()]);
}
