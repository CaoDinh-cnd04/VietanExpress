import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from '@/shared/lib/files';
import { missingHeaders, templateRows, toBatchOrder, validateRows } from './import-rows';

describe('order import', () => {
  it('file mẫu đọc lại được và dòng ví dụ hợp lệ', () => {
    const { headers, rows } = parseCsv(toCsv(templateRows()));
    expect(missingHeaders(headers)).toEqual([]);
    const [row] = validateRows(rows);
    expect(row?.errors).toEqual([]);
    expect(row?.line).toBe(2);
  });

  it('báo thiếu cột bắt buộc', () => {
    expect(missingHeaders(['RefNo', 'Country'])).toContain('ReceiverCompany');
  });

  it('báo lỗi từng dòng: thiếu trường, số sai, địa chỉ quá dài', () => {
    const [row] = validateRows([{ ReceiverCompany: 'A', Country: 'SG', WeightKg: 'abc', Address1: 'x'.repeat(31) }]);
    expect(row?.errors).toEqual(expect.arrayContaining(['Thiếu Phone', 'WeightKg phải là số > 0', 'Address1 quá 30 ký tự']));
  });

  it('tên cột không phân biệt hoa thường; CSV có ngoặc kép và dấu phẩy', () => {
    const { rows } = parseCsv('receivercompany,address1\n"ACME, Inc.","12 ""Main"" St"');
    const [row] = validateRows(rows);
    expect(row?.data.receiverCompany).toBe('ACME, Inc.');
    expect(row?.data.address1).toBe('12 "Main" St');
  });

  it('dựng payload batch theo dịch vụ mặc định', () => {
    const [row] = validateRows(parseCsv(toCsv(templateRows())).rows);
    const order = toBatchOrder(row!.data, { service: 'DHL', hub: 'DHL - VN', branch: 'Hà Nội' });
    expect(order).toMatchObject({ route: 'DHL - VN', branch: 'Hà Nội', cnee: 'LINEX CO. LTD', pcs: '1 kiện · 2.5 kg' });
  });
});
