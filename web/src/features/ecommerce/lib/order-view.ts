import type { Tone } from '@/shared/ui';
import { ECOM_STATUS } from '../constants';
import type { EcomOrder, EcomReceiver } from '../types';

/** Nhóm lọc nhanh trên tab Đơn hàng — theo việc khách cần làm tiếp. */
export type OrderView = 'all' | 'needsInfo' | 'pending' | 'billed' | 'exception';

export const ORDER_VIEWS: ReadonlyArray<{ key: OrderView; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'needsInfo', label: 'Cần bổ sung' },
  { key: 'pending', label: 'Chờ tạo bill' },
  { key: 'billed', label: 'Đã có bill' },
  { key: 'exception', label: 'Lỗi cần xử lý' }
];

const MATCH: Record<OrderView, (o: EcomOrder) => boolean> = {
  all: () => true,
  needsInfo: o => !o.bill && (o.issues?.length ?? 0) > 0,
  pending: o => !o.bill && o.st !== 'exception',
  billed: o => !!o.bill,
  exception: o => o.st === 'exception'
};

export const filterByView = (orders: ReadonlyArray<EcomOrder>, view: OrderView): EcomOrder[] => orders.filter(MATCH[view]);

export function countByView(orders: ReadonlyArray<EcomOrder>): Record<OrderView, number> {
  return { all: orders.length, needsInfo: filterByView(orders, 'needsInfo').length, pending: filterByView(orders, 'pending').length, billed: filterByView(orders, 'billed').length, exception: filterByView(orders, 'exception').length };
}

/** Nhãn trạng thái hiển thị: đơn chưa có bill (mới về từ sàn / mới nhập) là "Chờ tạo bill", không phải "Đã tạo". */
export function displayStatus(o: Pick<EcomOrder, 'st' | 'bill'>): { label: string; tone: Tone } {
  if (!o.bill && (o.st === 'created' || o.st === 'weighing')) return { label: 'Chờ tạo bill', tone: 'warning' };
  return ECOM_STATUS[o.st] ?? { label: o.st, tone: 'neutral' };
}

/** Các dòng địa chỉ người nhận như trên nhãn: đường → thành phố, bang, mã bưu chính → nước. */
export function receiverLines(r: EcomReceiver | undefined, fallbackCountry: string): string[] {
  if (!r) return fallbackCountry ? [fallbackCountry] : [];
  const cityLine = [r.city, r.state, r.postal].filter(Boolean).join(', ');
  return [r.address1, r.address2, cityLine, r.country ?? fallbackCountry].filter((s): s is string => !!s);
}

/** "59.9 USD" / "59.9" — trống khi chưa có giá trị. */
export const formatMoney = (value: number | null | undefined, currency: string | null | undefined, format: (n: number) => string): string =>
  value === null || value === undefined ? '' : `${format(value)}${currency ? ` ${currency}` : ''}`;
