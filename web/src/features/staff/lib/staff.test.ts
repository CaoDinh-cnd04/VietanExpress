import { describe, expect, it } from 'vitest';
import { formatDateTime, groupPermissions, togglePermission, toProfile } from './staff';

describe('groupPermissions', () => {
  it('gom theo module, giữ thứ tự và nhãn tiếng Việt', () => {
    const groups = groupPermissions([
      { code: 'ecommerce.view', description: 'Xem shop' },
      { code: 'shipments.create', description: 'Tạo đơn' },
      { code: 'shipments.view', description: 'Xem đơn' },
      { code: 'pickups.create', description: 'Đặt pickup' }
    ]);
    expect(groups.map(g => [g.label, g.items.map(i => i.code)])).toEqual([
      ['E-commerce', ['ecommerce.view']],
      ['Vận đơn & tạo đơn', ['shipments.create', 'shipments.view']],
      ['pickups', ['pickups.create']]
    ]);
  });
});

describe('togglePermission', () => {
  it('chọn quyền tạo đơn thì tự thêm quyền xem đơn', () => {
    expect(togglePermission([], 'shipments.create', true)).toEqual(['shipments.create', 'shipments.view']);
  });

  it('bỏ quyền xem thì bỏ luôn quyền phụ thuộc', () => {
    const current = ['ecommerce.view', 'shipments.create', 'shipments.issue-bill', 'shipments.view'];
    expect(togglePermission(current, 'shipments.view', false)).toEqual(['ecommerce.view']);
  });

  it('chọn xem toàn bộ đơn của công ty thì tự thêm quyền xem đơn', () => {
    expect(togglePermission([], 'shipments.view-all', true)).toEqual(['shipments.view', 'shipments.view-all']);
    expect(togglePermission(['shipments.view', 'shipments.view-all'], 'shipments.view', false)).toEqual([]);
  });

  it('bỏ quyền con không ảnh hưởng quyền xem', () => {
    expect(togglePermission(['shipments.create', 'shipments.view'], 'shipments.create', false)).toEqual(['shipments.view']);
  });
});

describe('toProfile', () => {
  it('cắt khoảng trắng, ô trống thành null', () => {
    expect(toProfile({ fullName: ' Lan ', email: ' ', phone: ' 0901 ', permissions: ['shipments.view'] }))
      .toEqual({ fullName: 'Lan', email: null, phone: '0901', permissions: ['shipments.view'] });
  });
});

describe('formatDateTime', () => {
  it('đổi sang dd/mm/yyyy HH:mm, giá trị trống thì rỗng', () => {
    expect(formatDateTime('2026-10-06T08:05:31')).toBe('06/10/2026 08:05');
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime('khác')).toBe('');
  });
});
