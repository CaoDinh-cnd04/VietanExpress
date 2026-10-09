import { describe, expect, it } from 'vitest';
import { recentSenderQuery, recentSenderSubtitle, senderFields } from './recent-senders';

describe('recent senders', () => {
  it('chữ gõ hợp lệ 1–100 ký tự', () => {
    expect(recentSenderQuery('  SGB ')).toBe('SGB');
    expect(recentSenderQuery('  ')).toBeNull();
    expect(recentSenderQuery('x'.repeat(101))).toBeNull();
  });

  it('điền đủ ô người gửi, ô trống thì xoá, cắt địa chỉ theo giới hạn', () => {
    const fields = Object.fromEntries(senderFields({ company: 'ABC', phone: '0909', address: '1234567890' }, 5));
    expect(fields).toEqual({ company: 'ABC', contact: '', tel: '0909', address: '12345', taxId: '', email: '', originalShipper: '' });
  });

  it('dòng phụ bỏ ô trống', () => {
    expect(recentSenderSubtitle({ company: 'ABC', contact: 'Lan', phone: '', address: 'HN' })).toBe('Lan · HN');
  });
});
