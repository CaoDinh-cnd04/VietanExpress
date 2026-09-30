import { describe, expect, it } from 'vitest';
import { cellRange, inRange, rangeSize, rangeToText } from './cell-range';

describe('cellRange', () => {
  it('kéo ngược chiều vẫn ra đúng vùng', () => {
    expect(cellRange({ row: 4, col: 2 }, { row: 1, col: 0 })).toEqual({ r0: 1, r1: 4, c0: 0, c1: 2 });
  });
  it('inRange / rangeSize', () => {
    const r = cellRange({ row: 0, col: 1 }, { row: 2, col: 1 });
    expect(inRange(r, 1, 1)).toBe(true);
    expect(inRange(r, 1, 2)).toBe(false);
    expect(inRange(null, 0, 0)).toBe(false);
    expect(rangeSize(r)).toBe(3);
  });
});

describe('rangeToText', () => {
  const grid = [
    ['6010839', 'MR SHAUN'],
    ['6010532', 'NOVAPRINT\nBRASIL']
  ];
  it('1 cột → mỗi dòng 1 giá trị', () => {
    expect(rangeToText({ r0: 0, r1: 1, c0: 0, c1: 0 }, (r, c) => grid[r]![c]!)).toBe('6010839\n6010532');
  });
  it('nhiều cột → Tab giữa các cột, bỏ xuống dòng trong ô', () => {
    expect(rangeToText({ r0: 0, r1: 1, c0: 0, c1: 1 }, (r, c) => grid[r]![c]!)).toBe('6010839\tMR SHAUN\n6010532\tNOVAPRINT BRASIL');
  });
});
