import { describe, expect, it } from 'vitest';
import { emptyPackage } from '../schema';
import { evaluatePackages, hasCritical } from './carrier-limits';

const pkg = (length: string, width: string, height: string, weight: string, qty = '1') => ({ ...emptyPackage(), qty, length, width, height, weight });

describe('evaluatePackages', () => {
  it('không cảnh báo với kiện bình thường', () => {
    expect(evaluatePackages('DHL', [pkg('30', '20', '15', '8')])).toEqual([]);
  });

  it('bỏ qua dòng chưa khai kích thước / cân', () => {
    expect(evaluatePackages('DHL', [emptyPackage()])).toEqual([]);
  });

  it('DHL: cạnh > 120cm là không nhận', () => {
    const w = evaluatePackages('DHL', [pkg('130', '20', '20', '5')]);
    expect(hasCritical(w)).toBe(true);
  });

  it('Chuyên tuyến: quá khổ, tổng cạnh lớn, quá nặng là cảnh báo', () => {
    const w = evaluatePackages('Chuyên tuyến', [pkg('160', '100', '90', '50')]);
    expect(w.map(x => x.level)).toEqual(expect.arrayContaining(['warning']));
    expect(w.filter(x => x.level === 'warning')).toHaveLength(3);
    expect(hasCritical(w)).toBe(false);
  });

  it('gợi ý khi quy đổi lớn hơn cân thực', () => {
    const w = evaluatePackages('UPS', [pkg('60', '50', '40', '5')]);
    expect(w.some(x => x.level === 'info')).toBe(true);
  });

  it('hãng chưa khai dùng giới hạn mặc định', () => {
    expect(hasCritical(evaluatePackages('Hãng lạ', [pkg('210', '10', '10', '1')]))).toBe(true);
  });
});
