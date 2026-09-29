import { describe, expect, it } from 'vitest';
import { toCsv } from '@/shared/lib/files';
import { invoiceTemplate, parseInvoiceCsv } from './invoice-import';

describe('parseInvoiceCsv', () => {
  it('đọc được file mẫu', () => {
    const { items, skipped } = parseInvoiceCsv(toCsv(invoiceTemplate()));
    expect(skipped).toEqual([]);
    expect(items[0]).toMatchObject({ descEn: "Women's flower dress", qty: '5', unit: 'PCS', price: '8' });
  });

  it('bỏ qua dòng lỗi và báo số dòng', () => {
    const csv = 'DescriptionEN,Qty,UnitPrice\n,1,2\nShoe,abc,2\nBag,1,';
    const { items, skipped } = parseInvoiceCsv(csv);
    expect(items).toHaveLength(0);
    expect(skipped).toEqual(['Dòng 2: thiếu DescriptionEN', 'Dòng 3: Qty không hợp lệ', 'Dòng 4: UnitPrice không hợp lệ']);
  });

  it('đơn vị lạ về PCS, xuất xứ trống về VN', () => {
    const { items } = parseInvoiceCsv('descriptionen,qty,unitprice,unit\nCup,2,1.5,cái');
    expect(items[0]).toMatchObject({ unit: 'PCS', origin: 'VN' });
  });
});
