import { describe, expect, it } from 'vitest';
import type { Session } from '../types';
import { can, PERMISSIONS } from './permissions';

const user = (permissions?: string[]): Session => ({
  status: 'authenticated',
  user: { customerCode: 'KH1', companyName: 'Công ty A', permissions }
});

describe('can', () => {
  it('không yêu cầu quyền thì luôn được', () => {
    expect(can(undefined)).toBe(true);
    expect(can(user([]), undefined)).toBe(true);
  });

  it('tài khoản con chỉ có quyền được cấp', () => {
    const staff = user([PERMISSIONS.shipmentsView]);
    expect(can(staff, PERMISSIONS.shipmentsView)).toBe(true);
    expect(can(staff, PERMISSIONS.shipmentsCreate)).toBe(false);
    expect(can(staff, PERMISSIONS.manageStaff)).toBe(false);
  });

  it('chưa đăng nhập hoặc đang tải phiên thì không có quyền', () => {
    expect(can({ status: 'anonymous' }, PERMISSIONS.shipmentsView)).toBe(false);
    expect(can(undefined, PERMISSIONS.shipmentsView)).toBe(false);
  });

  it('backend chưa bật đăng nhập hoặc chưa trả quyền thì không chặn', () => {
    expect(can({ status: 'open' }, PERMISSIONS.manageStaff)).toBe(true);
    expect(can(user(undefined), PERMISSIONS.manageStaff)).toBe(true);
  });
});
