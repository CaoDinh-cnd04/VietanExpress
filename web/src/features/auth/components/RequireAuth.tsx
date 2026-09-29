import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Button, Card, EmptyState } from '@/shared/ui';
import { useSession } from '../api';
import { loginPath } from '../lib/session';
import styles from './RequireAuth.module.css';

/** Chặn các trang portal khi chưa đăng nhập — chuyển về /login?next=<trang đang mở>. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession();
  const { pathname, search } = useLocation();

  if (session.isPending) {
    return <p className={styles.center}>Đang kiểm tra đăng nhập…</p>;
  }
  if (session.isError) {
    return (
      <div className={styles.center}>
        <Card>
          <EmptyState
            title="Không kết nối được máy chủ"
            description="Vui lòng kiểm tra mạng rồi thử lại."
            action={<Button variant="primary" onClick={() => void session.refetch()}>Thử lại</Button>}
          />
        </Card>
      </div>
    );
  }
  if (session.data.status === 'anonymous') {
    return <Navigate to={loginPath(pathname + search)} replace />;
  }
  return children;
}
