import type { EcomOrder } from '../types';

/** Nhóm lọc nhanh trên tab Đơn hàng — đồng thời là số liệu tóm tắt. */
export type OrderView = 'all' | 'weighing' | 'exception' | 'billed';

export const ORDER_VIEWS: ReadonlyArray<{ key: OrderView; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'weighing', label: 'Chờ cân đo' },
  { key: 'exception', label: 'Lỗi cần xử lý' },
  { key: 'billed', label: 'Đã có bill' }
];

const MATCH: Record<OrderView, (o: EcomOrder) => boolean> = {
  all: () => true,
  weighing: o => o.st === 'weighing',
  exception: o => o.st === 'exception',
  billed: o => !!o.bill
};

export const filterByView = (orders: ReadonlyArray<EcomOrder>, view: OrderView): EcomOrder[] => orders.filter(MATCH[view]);

export function countByView(orders: ReadonlyArray<EcomOrder>): Record<OrderView, number> {
  return { all: orders.length, weighing: filterByView(orders, 'weighing').length, exception: filterByView(orders, 'exception').length, billed: filterByView(orders, 'billed').length };
}
