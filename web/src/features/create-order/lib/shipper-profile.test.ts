import { describe, expect, it } from 'vitest';
import { defaultValues } from '../schema';
import { shipperFromProfile } from './shipper-profile';

const profile = {
  companyName: 'SCS CO., LTD',
  contactName: 'MR TUẤN ANH',
  phone: '0909 000 000',
  email: null,
  address: '14 Sâm Sơn, Phường 4, Quận Tân Bình, TP. Hồ Chí Minh, Việt Nam — kho số 2, lầu 3',
  taxCode: ' 0310278855 '
};

describe('shipperFromProfile', () => {
  it('đơn mới: điền tên công ty, người liên hệ, SĐT, địa chỉ, MST từ hồ sơ khách', () => {
    const fill = shipperFromProfile(defaultValues().shipper, profile);
    expect(fill).toMatchObject({ company: 'SCS CO., LTD', contact: 'MR TUẤN ANH', tel: '0909 000 000', taxId: '0310278855' });
    expect(fill.address).toHaveLength(60);
    expect(fill).not.toHaveProperty('email'); // hồ sơ không có email → không đụng ô
  });

  it('không ghi đè ô đã có dữ liệu (nhân bản đơn, mở lại nháp)', () => {
    const current = { ...defaultValues().shipper, company: 'CÔNG TY KHÁC', contact: '  ' };
    const fill = shipperFromProfile(current, profile);
    expect(fill).not.toHaveProperty('company');
    expect(fill.contact).toBe('MR TUẤN ANH');
  });
});
