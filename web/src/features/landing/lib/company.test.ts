import { describe, expect, it } from 'vitest';
import { copyrightRange, yearsSince } from './company';

describe('yearsSince', () => {
  it('tính số năm hoạt động', () => {
    expect(yearsSince(2010, new Date(2026, 8, 29))).toBe(16);
  });
  it('tối thiểu 1 năm', () => {
    expect(yearsSince(2026, new Date(2026, 0, 1))).toBe(1);
  });
});

describe('copyrightRange', () => {
  it('khoảng năm', () => {
    expect(copyrightRange(2013, new Date(2026, 0, 1))).toBe('2013 – 2026');
  });
  it('cùng năm', () => {
    expect(copyrightRange(2026, new Date(2026, 5, 1))).toBe('2026');
  });
});
