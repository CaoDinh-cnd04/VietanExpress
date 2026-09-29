import { useRef, useState, type ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';
import { Icon, type IconName } from './Icon';
import styles from './Feedback.module.css';

type NoticeTone = 'info' | 'warning' | 'danger' | 'success';

/** Hộp thông báo trong trang (lưu ý, cảnh báo, lỗi). */
export function Notice({ tone = 'info', title, children }: { tone?: NoticeTone; title?: ReactNode; children?: ReactNode }) {
  return (
    <div className={cx(styles.notice, styles[tone])} role={tone === 'danger' ? 'alert' : 'note'}>
      {title && <strong className={styles.noticeTitle}>{title}</strong>}
      {children && <div>{children}</div>}
    </div>
  );
}

/** Thẻ số liệu (dashboard, tổng quan). */
export function StatCard({ label, value, hint, tone, icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'brand' | 'warning' | 'danger'; icon?: IconName }) {
  return (
    <div className={cx(styles.stat, tone && styles[`stat_${tone}`])}>
      <div className={styles.statTop}>
        <span className={styles.statLabel}>{label}</span>
        {icon && <Icon name={icon} size={18} className={styles.statIcon} />}
      </div>
      <div className={styles.statValue}>{value}</div>
      {hint && <div className={styles.statHint}>{hint}</div>}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={styles.statGrid}>{children}</div>;
}

interface FileDropProps {
  accept: string;
  onFile: (file: File) => void;
  title?: string;
  hint?: ReactNode;
  disabled?: boolean;
}

/** Vùng kéo-thả / chọn tệp. */
export function FileDrop({ accept, onFile, title = 'Kéo & thả tệp vào đây hoặc bấm để chọn', hint, disabled }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (files: FileList | null) => {
    const f = files?.[0];
    if (f) onFile(f);
  };

  return (
    <div
      className={cx(styles.drop, over && styles.dropOver, disabled && styles.dropDisabled)}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragOver={e => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault();
        setOver(false);
        if (!disabled) take(e.dataTransfer.files);
      }}
    >
      <Icon name="upload" size={26} />
      <strong>{title}</strong>
      {hint && <span className={styles.dropHint}>{hint}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="visually-hidden"
        tabIndex={-1}
        onChange={e => {
          take(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/** Danh sách cặp nhãn – giá trị (chi tiết đơn, ticket…). */
export function KeyValueList({ items }: { items: ReadonlyArray<[label: string, value: ReactNode]> }) {
  return (
    <dl className={styles.kv}>
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
