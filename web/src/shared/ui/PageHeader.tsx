import type { ReactNode } from 'react';
import { useTranslateNode } from '@/shared/i18n';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const tr = useTranslateNode();
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>{tr(title)}</h1>
        {description && <p className={styles.description}>{tr(description)}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
