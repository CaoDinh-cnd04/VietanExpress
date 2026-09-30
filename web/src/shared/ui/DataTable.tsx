import type { ReactNode } from 'react';
import { useI18n, useTranslateNode } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { EmptyState } from './EmptyState';
import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  /** Độ rộng cột, VD 120 hoặc '20%'. */
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  /** Class thêm cho ô (VD làm nổi bật cột). */
  className?: string;
}

interface DataTableProps<T> {
  columns: ReadonlyArray<Column<T>>;
  rows: ReadonlyArray<T>;
  rowKey: (row: T) => string;
  loading?: boolean;
  /** Nội dung khi không có dòng nào. */
  empty?: { title: string; description?: ReactNode; action?: ReactNode };
  onRowClick?: (row: T) => void;
  /** Tô sáng dòng (VD dịch vụ rẻ nhất). */
  highlight?: (row: T) => boolean;
  minWidth?: number;
  caption?: string;
}

/**
 * Bảng dữ liệu dùng chung: khai báo cột bằng mảng `columns`, không cần viết <table> thủ công.
 * Bảng đặc thù (có ô nhập liệu, gộp dòng…) vẫn có thể tự viết riêng.
 */
export function DataTable<T>({ columns, rows, rowKey, loading, empty, onRowClick, highlight, minWidth = 720, caption }: DataTableProps<T>) {
  const { t } = useI18n();
  const tr = useTranslateNode();
  if (!loading && !rows.length && empty) return <EmptyState {...empty} />;

  return (
    <div className={styles.scroll}>
      <table className={cx(styles.table, loading && styles.loading)} style={{ minWidth }} aria-busy={loading || undefined}>
        {caption && <caption className="visually-hidden">{t(caption)}</caption>}
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} style={{ width: c.width, textAlign: c.align }}>{tr(c.header)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row)}
              className={cx(onRowClick && styles.clickable, highlight?.(row) && styles.highlight)}
              onClick={onRowClick ? e => !(e.target as HTMLElement).closest('button,a,input,select,label') && onRowClick(row) : undefined}
            >
              {columns.map(c => (
                <td key={c.key} className={c.className} style={{ textAlign: c.align }}>{c.render(row, i)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
