import { describe, expect, it } from 'vitest';
import { arrowMove, sanitizeDecimal } from './cell-nav';

describe('arrowMove', () => {
  it('cuối ô + → thì sang ô sau, đầu ô + ← thì về ô trước', () => {
    expect(arrowMove('ArrowRight', 2, 2, 2)).toBe('next');
    expect(arrowMove('ArrowLeft', 0, 0, 2)).toBe('prev');
    expect(arrowMove('ArrowRight', 0, 0, 0)).toBe('next'); // ô trống
  });

  it('con trỏ ở giữa / bôi đen / ô không đọc được vị trí → không chuyển', () => {
    expect(arrowMove('ArrowRight', 1, 1, 2)).toBeNull();
    expect(arrowMove('ArrowLeft', 1, 1, 2)).toBeNull();
    expect(arrowMove('ArrowRight', 0, 2, 2)).toBeNull();
    expect(arrowMove('ArrowRight', null, null, 2)).toBeNull();
    expect(arrowMove('ArrowUp', 2, 2, 2)).toBeNull();
  });
});

describe('sanitizeDecimal', () => {
  it('giữ chữ số và 1 dấu thập phân', () => {
    expect(sanitizeDecimal('12,5kg')).toBe('12.5');
    expect(sanitizeDecimal('1.2.3')).toBe('1.23');
    expect(sanitizeDecimal('a45')).toBe('45');
  });

  it('số nguyên chỉ giữ chữ số', () => {
    expect(sanitizeDecimal('3.5', true)).toBe('35');
  });
});
