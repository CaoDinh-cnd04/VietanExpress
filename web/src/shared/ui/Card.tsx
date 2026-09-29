import type { ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';
import styles from './Card.module.css';

interface CardProps {
  title?: ReactNode;
  /** Chú thích phụ cạnh tiêu đề, VD "(Shipper)". */
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Bỏ padding thân — dùng cho bảng tràn viền. */
  flush?: boolean;
  children: ReactNode;
}

export function Card({ title, subtitle, actions, className, flush, children }: CardProps) {
  return (
    <section className={cx(styles.card, className)}>
      {(title || actions) && (
        <header className={styles.header}>
          {title && (
            <h3 className={styles.title}>
              {title} {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
            </h3>
          )}
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      <div className={cx(!flush && styles.body)}>{children}</div>
    </section>
  );
}
