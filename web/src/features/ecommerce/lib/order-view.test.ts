import { describe, expect, it } from 'vitest';
import type { EcomOrder } from '../types';
import { countByView, displayStatus, filterByView, formatMoney, receiverLines } from './order-view';

const order = (id: string, st: EcomOrder['st'], bill = ''): EcomOrder => ({ id, src: 'shopify', ref: id, bill, cnee: 'A', ct: 'US', items: 1, kg: 1, st, createdAt: '05/10/2026 09:00' });
const orders = [order('1', 'created'), order('2', 'exception'), order('3', 'created', 'VA1'), order('4', 'delivered', 'VA2'), order('5', 'weighing')];

describe('filterByView / countByView', () => {
  it('lọc theo việc cần làm', () => {
    expect(filterByView(orders, 'all')).toHaveLength(5);
    expect(filterByView(orders, 'pending').map(o => o.id)).toEqual(['1', '5']);
    expect(filterByView(orders, 'billed').map(o => o.id)).toEqual(['3', '4']);
    expect(filterByView(orders, 'exception').map(o => o.id)).toEqual(['2']);
  });

  it('đếm từng nhóm', () => {
    expect(countByView(orders)).toEqual({ all: 5, pending: 2, billed: 2, exception: 1 });
    expect(countByView([])).toEqual({ all: 0, pending: 0, billed: 0, exception: 0 });
  });
});

describe('displayStatus', () => {
  it('đơn chưa có bill hiện "Chờ tạo bill"', () => {
    expect(displayStatus({ st: 'created', bill: '' }).label).toBe('Chờ tạo bill');
    expect(displayStatus({ st: 'weighing', bill: '' }).label).toBe('Chờ tạo bill');
  });

  it('đơn đã có bill / lỗi giữ nhãn trạng thái', () => {
    expect(displayStatus({ st: 'created', bill: 'VA1' }).label).toBe('Đã tạo');
    expect(displayStatus({ st: 'exception', bill: '' }).tone).toBe('danger');
  });
});

describe('receiverLines / formatMoney', () => {
  it('ghép địa chỉ, bỏ dòng trống', () => {
    expect(receiverLines({ address1: '1 Main St', address2: '', city: 'Sydney', state: 'NSW', postal: '2000', country: 'Australia' }, 'AU'))
      .toEqual(['1 Main St', 'Sydney, NSW, 2000', 'Australia']);
    expect(receiverLines(undefined, 'Japan')).toEqual(['Japan']);
  });

  it('giá trị kèm tiền tệ', () => {
    const f = (n: number) => String(n);
    expect(formatMoney(59.9, 'USD', f)).toBe('59.9 USD');
    expect(formatMoney(10, null, f)).toBe('10');
    expect(formatMoney(null, 'USD', f)).toBe('');
  });
});
