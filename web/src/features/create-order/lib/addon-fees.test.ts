import { describe, expect, it } from 'vitest';
import { addonFeeRows, formatAddonFee } from './addon-fees';

describe('formatAddonFee', () => {
  it('tiền theo đơn vị tính, phần trăm, miễn phí, chưa có giá', () => {
    expect(formatAddonFee({ fee: 50000, currency: 'VND', unit: 'kiện' })).toBe('50.000 VND / kiện');
    expect(formatAddonFee({ fee: 1.5, currency: '%', unit: 'giá trị hàng' })).toBe('1,5% giá trị hàng');
    expect(formatAddonFee({ fee: 0, currency: 'VND', unit: 'đơn' })).toBe('Miễn phí');
    expect(formatAddonFee({ fee: null, currency: 'VND', unit: 'đơn' })).toBeNull();
  });
});

describe('addonFeeRows', () => {
  const addons = [
    { name: 'Đóng gói hộ', description: 'A' },
    { name: 'Dán nhãn Fragile (dễ vỡ)', description: 'B' }
  ];

  it('giữ thứ tự danh sách trên form, ghép phí theo tên (không phân biệt hoa thường)', () => {
    const rows = addonFeeRows(addons, [{ name: 'đóng gói hộ', fee: 30000, currency: 'VND', unit: 'kiện', note: ' Tối thiểu 1 kiện ' }]);
    expect(rows).toEqual([
      { name: 'Đóng gói hộ', description: 'A', price: '30.000 VND / kiện', note: 'Tối thiểu 1 kiện' },
      { name: 'Dán nhãn Fragile (dễ vỡ)', description: 'B', price: null, note: null }
    ]);
  });

  it('backend chưa có biểu phí → mọi dòng chưa có giá', () => {
    expect(addonFeeRows(addons, undefined).every(r => r.price === null)).toBe(true);
  });
});
