import type { ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';
import styles from './StatusPill.module.css';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

export function StatusPill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx(styles.pill, styles[tone])}>{children}</span>;
}
