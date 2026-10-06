import { describe, expect, it } from 'vitest';
import { PATTERNS, code128Svg, code128Values, code128Widths } from './code128';

describe('code128', () => {
  it('bảng ký hiệu đúng chuẩn: 107 mẫu, mỗi mẫu 11 module (STOP 13), không trùng', () => {
    expect(PATTERNS).toHaveLength(107);
    PATTERNS.forEach((p, i) => expect([...p].reduce((s, c) => s + Number(c), 0)).toBe(i === 106 ? 13 : 11));
    expect(new Set(PATTERNS).size).toBe(107);
  });

  // 104 + P(48)·1 + J(42)·2 + J(42)·3 + 1(17)·4 + 2(18)·5 + 3(19)·6 + C(35)·7 = 879; 879 mod 103 = 55
  it('checksum theo chuẩn ("PJJ123C" → 55)', () => {
    const v = code128Values('PJJ123C');
    expect(v[0]).toBe(104);
    expect(v.at(-2)).toBe(55);
    expect(v.at(-1)).toBe(106);
  });

  it('độ dài: 11 module mỗi ký hiệu + 13 cho STOP', () => {
    const text = '#cozy23445';
    expect(code128Widths(text).reduce((a, b) => a + b, 0)).toBe(11 * (text.length + 2) + 13);
  });

  it('ký tự ngoài ASCII thay bằng "?"; SVG có vạch', () => {
    expect(code128Values('é')[1]).toBe('?'.charCodeAt(0) - 32);
    expect(code128Svg('A1')).toContain('<rect');
  });
});
