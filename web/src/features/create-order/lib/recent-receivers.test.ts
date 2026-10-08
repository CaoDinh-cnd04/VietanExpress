import { describe, expect, it } from 'vitest';
import { receiverFields, recentReceiverQuery, recentReceiverSubtitle, type RecentReceiver } from './recent-receivers';

const seeSeng: RecentReceiver = {
  company: 'SEE SENG PTE LTD', contact: 'Ms. KELLY', phone: '83682275 - 62933921', phoneCode: '+65', email: 'admin@seeseng.sg',
  country: 'Singapore', city: 'SINGAPORE', postalCode: '349565', address1: '80 GENTING LANE ,', address2: 'GENTING BLOCK # 04-03',
  address3: 'RUBY INDUSTRIAL COMPLEX SINGAPORE 349565', lastUsed: '2026-10-01'
};

describe('recentReceiverQuery', () => {
  it('gõ 1 chữ là tìm, bỏ khoảng trắng 2 đầu', () => {
    expect(recentReceiverQuery(' S ')).toBe('S');
    expect(recentReceiverQuery('   ')).toBeNull();
    expect(recentReceiverQuery('x'.repeat(101))).toBeNull();
  });
});

describe('recentReceiverSubtitle', () => {
  it('nước · điện thoại (ngày gửi dd-mm-yyyy)', () => {
    expect(recentReceiverSubtitle(seeSeng)).toBe('Singapore · 83682275 - 62933921 (01-10-2026)');
    expect(recentReceiverSubtitle({ company: 'A' })).toBe('');
  });
});

describe('receiverFields', () => {
  it('điền đủ mọi ô, ô đơn cũ để trống thì xoá', () => {
    const fields = Object.fromEntries(receiverFields(seeSeng));
    expect(fields).toMatchObject({
      company: 'SEE SENG PTE LTD', contact: 'Ms. KELLY', tel: '83682275 - 62933921', country: 'Singapore', postal: '349565',
      addr1: '80 GENTING LANE ,', addr3: 'RUBY INDUSTRIAL COMPLEX SINGAPORE 349565', state: '', taxId: '', iossNo: ''
    });
  });
});
