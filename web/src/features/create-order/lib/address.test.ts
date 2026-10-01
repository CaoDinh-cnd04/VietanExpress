import { describe, expect, it } from 'vitest';
import { splitAddressLines } from './address';

describe('splitAddressLines', () => {
  it('địa chỉ 1 quá 30 ký tự → cắt ở khoảng trắng gần nhất, phần thừa xuống địa chỉ 2', () => {
    const r = splitAddressLines(['550 Park Ter 9220 Holly Blvd 9220 Holly Blvd', '', ''], 30);
    expect(r.lines).toEqual(['550 Park Ter 9220 Holly Blvd', '9220 Holly Blvd', '']);
    expect(r.overflowFrom).toBe(0);
  });

  it('phần thừa đặt trước nội dung đã có ở dòng sau, dồn tiếp xuống địa chỉ 3', () => {
    const r = splitAddressLines(['550 Park Ter 9220 Holly Blvd Apt', 'Suite 12 Building Blue Tower East', ''], 30);
    expect(r.lines.every(l => l.length <= 30)).toBe(true);
    expect(r.lines.join(' ')).toBe('550 Park Ter 9220 Holly Blvd Apt Suite 12 Building Blue Tower East');
  });

  it('không có khoảng trắng thì cắt cứng; không quá dài thì giữ nguyên', () => {
    expect(splitAddressLines(['x'.repeat(35), '', ''], 30).lines).toEqual(['x'.repeat(30), 'xxxxx', '']);
    expect(splitAddressLines(['550 Park Ter', '9220 Holly Blvd', ''], 30)).toEqual({ lines: ['550 Park Ter', '9220 Holly Blvd', ''], overflowFrom: null });
  });
});
