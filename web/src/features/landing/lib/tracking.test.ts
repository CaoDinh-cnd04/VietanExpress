import { describe, expect, it } from 'vitest';
import { billsFromQuery, billsToQuery, MAX_TRACK_BILLS, parseBills } from './tracking';

describe('parseBills', () => {
  it('tách theo dòng, dấu phẩy, khoảng trắng; viết hoa; bỏ trùng', () => {
    expect(parseBills('va123456\nVA123456, 6156979  ;  1Z999AA10123456784').bills).toEqual(['VA123456', '6156979', '1Z999AA10123456784']);
  });
  it('bỏ gạch nối, dấu chấm trong mã', () => {
    expect(parseBills('615-697.9').bills).toEqual(['6156979']);
  });
  it('mã sai định dạng vào danh sách invalid, giữ nguyên chữ khách nhập', () => {
    const r = parseBills('12345 abc#123 VA123456');
    expect(r.bills).toEqual(['VA123456']);
    expect(r.invalid).toEqual(['12345', 'abc#123']);
  });
  it('giới hạn số mã mỗi lần', () => {
    const text = Array.from({ length: MAX_TRACK_BILLS + 3 }, (_, i) => `VA${100000 + i}`).join('\n');
    const r = parseBills(text);
    expect(r.bills).toHaveLength(MAX_TRACK_BILLS);
    expect(r.dropped).toBe(3);
  });
  it('ô trống', () => {
    expect(parseBills('  \n ')).toEqual({ bills: [], invalid: [], dropped: 0 });
  });
});

describe('query ?track=', () => {
  it('đọc và ghi qua lại', () => {
    expect(billsFromQuery(billsToQuery(['VA123456', '6156979']))).toEqual(['VA123456', '6156979']);
    expect(billsFromQuery(null)).toEqual([]);
  });
});
