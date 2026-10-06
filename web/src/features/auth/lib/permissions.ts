import type { Session } from '../types';

/** Mã quyền do backend cấp — trùng `*Permissions` ở backend (Contracts của từng module). */
export const PERMISSIONS = {
  shipmentsView: 'shipments.view',
  shipmentsCreate: 'shipments.create',
  shipmentsUpdate: 'shipments.update',
  shipmentsIssueBill: 'shipments.issue-bill',
  /** Tài khoản con xem mọi đơn của công ty (không có thì chỉ thấy đơn mình tạo). */
  shipmentsViewAll: 'shipments.view-all',
  ecommerceView: 'ecommerce.view',
  ecommerceConnect: 'ecommerce.connect',
  manageStaff: 'account.staff',
  myTracking: 'account.mytracking'
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Phiên có quyền `permission` không. Không yêu cầu quyền → luôn được.
 * Backend chưa bật đăng nhập (`open`) hoặc chưa trả danh sách quyền → cho qua như trước (backend vẫn kiểm tra lại).
 */
export function can(session: Session | undefined, permission?: string): boolean {
  if (!permission) return true;
  if (!session || session.status === 'anonymous') return false;
  if (session.status === 'open') return true;
  const { permissions } = session.user;
  return permissions === undefined || permissions.includes(permission);
}
