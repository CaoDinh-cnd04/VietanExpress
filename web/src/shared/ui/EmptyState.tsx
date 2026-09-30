import type { ReactNode } from 'react';
import { useTranslateNode } from '@/shared/i18n';
import styles from './EmptyState.module.css';

/** Trạng thái trống / lỗi trong khung dữ liệu. */
export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  const tr = useTranslateNode();
  return (
    <div className={styles.empty}>
      <p className={styles.title}>{tr(title)}</p>
      {description && <p>{tr(description)}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
