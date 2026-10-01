import { fill } from '@/shared/i18n';
import type { AddonFee } from '../api';

export interface AddonFeeRow {
  name: string;
  description: string;
  /** Chuỗi hiển thị phí; null khi chưa có giá. */
  price: string | null;
  note: string | null;
}

/** Định dạng phí: "50.000 VND / kiện"; % thì "1,5% giá trị hàng"; 0 là "Miễn phí". */
export function formatAddonFee(f: Pick<AddonFee, 'fee' | 'currency' | 'unit'>, locale = 'vi-VN'): string | null {
  if (f.fee === null || !Number.isFinite(f.fee)) return null;
  if (f.fee === 0) return 'Miễn phí';
  const amount = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(f.fee);
  if (f.currency === '%') return fill('{n}% {unit}', { n: amount, unit: f.unit }).trim();
  return f.unit ? fill('{n} {cur} / {unit}', { n: amount, cur: f.currency, unit: f.unit }) : `${amount} ${f.currency}`;
}

/**
 * Bảng biểu phí: giữ đúng thứ tự & mô tả của danh sách tùy chọn dịch vụ trên form,
 * ghép phí từ backend theo tên (dịch vụ chưa có giá → price null).
 */
export function addonFeeRows(addons: ReadonlyArray<{ name: string; description: string }>, fees: readonly AddonFee[] | undefined): AddonFeeRow[] {
  const byName = new Map((fees ?? []).map(f => [f.name.trim().toLowerCase(), f]));
  return addons.map(a => {
    const f = byName.get(a.name.toLowerCase());
    return { name: a.name, description: a.description, price: f ? formatAddonFee(f) : null, note: f?.note?.trim() || null };
  });
}
