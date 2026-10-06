import type { AssignablePermission, StaffProfile } from '../types';

/** Nhóm quyền theo module (phần trước dấu chấm của mã quyền) để hiển thị ô chọn. */
export const PERMISSION_GROUPS: Readonly<Record<string, string>> = {
  shipments: 'Vận đơn & tạo đơn',
  ecommerce: 'E-commerce'
};

export interface PermissionGroup {
  key: string;
  label: string;
  items: AssignablePermission[];
}

/** Gom quyền theo module, giữ thứ tự backend trả; module chưa khai nhãn hiện mã module. */
export function groupPermissions(list: readonly AssignablePermission[]): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>();
  for (const p of list) {
    const key = p.code.split('.')[0] ?? p.code;
    const group = groups.get(key) ?? { key, label: PERMISSION_GROUPS[key] ?? key, items: [] };
    group.items.push(p);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/**
 * Quyền phụ thuộc: tạo / sửa / in đơn đều cần xem đơn, kết nối shop cần xem shop.
 * Chọn quyền con thì tự thêm quyền xem; bỏ quyền xem thì bỏ luôn quyền con.
 */
const REQUIRES: Readonly<Record<string, string>> = {
  'shipments.create': 'shipments.view',
  'shipments.update': 'shipments.view',
  'shipments.issue-bill': 'shipments.view',
  'shipments.view-all': 'shipments.view',
  'ecommerce.connect': 'ecommerce.view'
};

export function togglePermission(current: readonly string[], code: string, checked: boolean): string[] {
  const next = new Set(current);
  if (checked) {
    next.add(code);
    const required = REQUIRES[code];
    if (required) next.add(required);
  } else {
    next.delete(code);
    for (const [child, parent] of Object.entries(REQUIRES)) if (parent === code) next.delete(child);
  }
  return [...next].sort();
}

/** Ô để trống gửi null; cắt khoảng trắng. */
export function toProfile(values: { fullName: string; email: string; phone: string; permissions: string[] }): StaffProfile {
  const blank = (v: string) => (v.trim() ? v.trim() : null);
  return { fullName: values.fullName.trim(), email: blank(values.email), phone: blank(values.phone), permissions: values.permissions };
}

/** '2026-10-06T08:05:00' (giờ Việt Nam từ backend) → '06/10/2026 08:05'. */
export function formatDateTime(value?: string | null): string {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : '';
}
