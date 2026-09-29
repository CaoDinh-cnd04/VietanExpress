import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

/** Trạng thái trống / lỗi trong khung dữ liệu. */
export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <p className={styles.title}>{title}</p>
      {description && <p>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
