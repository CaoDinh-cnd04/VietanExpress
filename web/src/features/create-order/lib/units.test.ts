import { describe, expect, it } from 'vitest';
import { normalizeUnit, OTHER_UNIT, unitChoice, UNIT_MAX } from './units';

describe('unitChoice', () => {
  it('đơn vị có sẵn (không phân biệt hoa thường)', () => {
    expect(unitChoice('PCS')).toBe('PCS');
    expect(unitChoice('bag')).toBe('Bag');
  });
  it('đơn vị tự nhập hoặc đang trống → Khác', () => {
    expect(unitChoice('KG')).toBe(OTHER_UNIT);
    expect(unitChoice('')).toBe(OTHER_UNIT);
  });
});

describe('normalizeUnit', () => {
  it('trống → PCS', () => expect(normalizeUnit('  ')).toBe('PCS'));
  it('viết đúng chuẩn đơn vị có sẵn', () => expect(normalizeUnit(' box ')).toBe('BOX'));
  it('giữ đơn vị khách tự nhập', () => expect(normalizeUnit('Đôi')).toBe('Đôi'));
  it('cắt bớt nếu quá dài', () => expect(normalizeUnit('x'.repeat(30))).toHaveLength(UNIT_MAX));
});
