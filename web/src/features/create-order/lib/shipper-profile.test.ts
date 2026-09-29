import { describe, expect, it } from 'vitest';
import { defaultValues } from '../schema';
import { shipperFromProfile } from './shipper-profile';

const profile = { companyName: 'SCS CO., LTD', contactName: ' MR TUẤN ANH ' };

describe('shipperFromProfile', () => {
  it('đơn mới: chỉ điền tên công ty và người liên hệ, các ô khác để khách tự nhập', () => {
    expect(shipperFromProfile(defaultValues().shipper, profile)).toEqual({ company: 'SCS CO., LTD', contact: 'MR TUẤN ANH' });
  });

  it('không ghi đè ô đã có dữ liệu (nhân bản đơn, mở lại nháp)', () => {
    const current = { ...defaultValues().shipper, company: 'CÔNG TY KHÁC', contact: '  ' };
    expect(shipperFromProfile(current, profile)).toEqual({ contact: 'MR TUẤN ANH' });
  });

  it('hồ sơ không có người liên hệ thì để trống', () => {
    expect(shipperFromProfile(defaultValues().shipper, { companyName: 'SCS', contactName: null })).toEqual({ company: 'SCS' });
  });
});
