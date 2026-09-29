import { describe, expect, it } from 'vitest';
import { datePart, estimatePodDate, parseViDate } from './order-utils';

describe('parseViDate', () => {
  it('đọc ngày giờ kiểu Việt Nam', () => {
    expect(parseViDate('08/09/2026 14:02')?.getTime()).toBe(new Date(2026, 8, 8, 14, 2).getTime());
  });
  it('trả về null khi rỗng hoặc sai định dạng', () => {
    expect(parseViDate('')).toBeNull();
    expect(parseViDate('2026-09-08')).toBeNull();
  });
});

describe('estimatePodDate', () => {
  it('cộng số ngày vận chuyển theo hãng', () => {
    expect(estimatePodDate({ sent: '08/09/2026', route: 'DHL - Singapore', pod: null })).toBe('11/09/2026');
    expect(estimatePodDate({ sent: '08/09/2026', route: 'Chuyên tuyến - EU', pod: null })).toBe('13/09/2026');
  });
  it('không ước tính khi đã phát hoặc chưa gửi', () => {
    expect(estimatePodDate({ sent: '08/09/2026', route: 'DHL', pod: { date: '10/09/2026', time: '10:00', signer: 'A' } })).toBe('');
    expect(estimatePodDate({ sent: '', route: 'DHL', pod: null })).toBe('');
  });
  it('qua tháng đúng', () => {
    expect(estimatePodDate({ sent: '29/09/2026', route: 'UPS - US', pod: null })).toBe('03/10/2026');
  });
});

describe('datePart', () => {
  it('bỏ phần giờ', () => expect(datePart('09/09/2026 09:12')).toBe('09/09/2026'));
});
