import { describe, expect, it } from 'vitest';
import { activeIndex, nextLeft, prevLeft } from './carousel';

const s = (left: number) => ({ left, max: 900, step: 300 });

describe('nextLeft', () => {
  it('tiến 1 thẻ', () => expect(nextLeft(s(0))).toBe(300));
  it('không vượt quá cuối', () => expect(nextLeft(s(800))).toBe(900));
  it('ở cuối thì quay về đầu', () => {
    expect(nextLeft(s(900))).toBe(0);
    expect(nextLeft(s(898))).toBe(0); // sai số làm tròn
  });
});

describe('prevLeft', () => {
  it('lùi 1 thẻ', () => expect(prevLeft(s(600))).toBe(300));
  it('không lùi quá đầu', () => expect(prevLeft(s(100))).toBe(0));
  it('ở đầu thì nhảy tới cuối', () => expect(prevLeft(s(0))).toBe(900));
});

describe('activeIndex', () => {
  it('theo vị trí cuộn', () => {
    expect(activeIndex(s(0), 8)).toBe(0);
    expect(activeIndex(s(310), 8)).toBe(1);
  });
  it('ở cuối là thẻ cuối', () => expect(activeIndex(s(900), 8)).toBe(7));
  it('dữ liệu rỗng', () => expect(activeIndex({ left: 0, max: 0, step: 0 }, 0)).toBe(0));
});
