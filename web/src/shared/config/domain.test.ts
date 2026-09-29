import { describe, expect, it } from 'vitest';
import { CARRIER_HUBS, CARRIERS, DEFAULT_SERVICE, defaultHub, hubLabel, hubOptions } from './domain';

describe('hãng / hub', () => {
  it('đủ 8 hãng theo hệ thống cũ, giá trị hub dạng "Hãng - Hub"', () => {
    expect(CARRIERS).toEqual(['Aramex', 'DHL', 'Fedex', 'UPS', 'Chuyên tuyến', 'Ủy quyền Việt An', 'Ecommerce', 'SEA']);
    expect(CARRIER_HUBS.Fedex).toContain('Fedex - SIN 3 (FICP)');
    expect(CARRIER_HUBS['Chuyên tuyến']).toContain(DEFAULT_SERVICE.hub);
  });

  it('nhãn chỉ hiện tên hub, kể cả hub có dấu gạch', () => {
    expect(hubLabel('Chuyên tuyến - USA - Sea')).toBe('USA - Sea');
    expect(hubLabel('DHL - SIN VIP')).toBe('SIN VIP');
    expect(hubOptions('Ecommerce')).toEqual([
      { value: 'Ecommerce - SING POST', label: 'SING POST' },
      { value: 'Ecommerce - Việt An', label: 'Việt An' }
    ]);
    expect(hubOptions('Không có')).toEqual([]);
  });

  it('đổi hãng: 1 hub thì chọn luôn, nhiều hub thì để khách chọn', () => {
    expect(defaultHub('Aramex')).toBe('Aramex - Dubai');
    expect(defaultHub('Ủy quyền Việt An')).toBe('Ủy quyền Việt An - Tự chọn');
    expect(defaultHub('DHL')).toBe('');
  });
});
