import { describe, expect, it } from 'vitest';
import { autosaveKey } from './useOrderPrefill';

describe('autosaveKey', () => {
  it('khóa riêng theo tài khoản — admin và nhân viên cùng công ty không dùng chung bản tự lưu', () => {
    const admin = autosaveKey({ customerCode: 'SGB', userName: 'admin' });
    const staff = autosaveKey({ customerCode: 'SGB', userName: 'kho.hn' });
    expect(admin).not.toBe(staff);
    expect(admin).toBe('va.createOrder.autosave:SGB:admin');
  });

  it('chưa có phiên (backend chưa bật đăng nhập) dùng khóa chung', () => {
    expect(autosaveKey(null)).toBe('va.createOrder.autosave');
  });
});
