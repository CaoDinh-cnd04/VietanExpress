import type { ReactNode } from 'react';
import { Card, EmptyState } from '@/shared/ui';
import { useCan } from '../api';

/** Chặn trang khi tài khoản (thường là tài khoản con của nhân viên) không có quyền — backend vẫn kiểm tra lại. */
export function RequirePermission({ permission, children }: { permission?: string; children: ReactNode }) {
  const allowed = useCan();
  if (allowed(permission)) return children;
  return (
    <Card>
      <EmptyState
        title="Bạn không có quyền truy cập trang này"
        description="Liên hệ quản trị viên tài khoản công ty của bạn để được cấp quyền."
      />
    </Card>
  );
}
