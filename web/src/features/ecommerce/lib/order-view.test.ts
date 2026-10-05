import { describe, expect, it } from 'vitest';
import type { EcomOrder } from '../types';
import { countByView, filterByView } from './order-view';

const order = (id: string, st: EcomOrder['st'], bill = ''): EcomOrder => ({ id, src: 'shopify', ref: id, bill, cnee: 'A', ct: 'US', items: 1, kg: 1, st, createdAt: '2026-10-05' });
const orders = [order('1', 'weighing'), order('2', 'exception'), order('3', 'created', 'VA1'), order('4', 'delivered', 'VA2')];

describe('filterByView / countByView', () => {
  it('lọc theo nhóm', () => {
    expect(filterByView(orders, 'all')).toHaveLength(4);
    expect(filterByView(orders, 'weighing').map(o => o.id)).toEqual(['1']);
    expect(filterByView(orders, 'exception').map(o => o.id)).toEqual(['2']);
    expect(filterByView(orders, 'billed').map(o => o.id)).toEqual(['3', '4']);
  });

  it('đếm từng nhóm', () => {
    expect(countByView(orders)).toEqual({ all: 4, weighing: 1, exception: 1, billed: 2 });
    expect(countByView([])).toEqual({ all: 0, weighing: 0, exception: 0, billed: 0 });
  });
});
