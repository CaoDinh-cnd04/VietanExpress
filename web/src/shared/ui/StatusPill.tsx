import type { ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';
import { useTranslateNode } from '@/shared/i18n';
import styles from './StatusPill.module.css';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

export function StatusPill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const tr = useTranslateNode();
  return <span className={cx(styles.pill, styles[tone])}>{tr(children)}</span>;
}
