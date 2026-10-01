import type { ReactNode } from 'react';
import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import styles from './Sheet.module.css';

/**
 * Bố cục "phiếu vận đơn" để xem chi tiết đơn: giống bản in — chữ đen trên nền trắng, kẻ ô mảnh,
 * mỗi phần là 1 ô có số thứ tự + tiêu đề, bên trong là cặp nhãn nhỏ / giá trị. Không dùng màu trang trí.
 */
export function Sheet({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(styles.sheet, className)}>{children}</div>;
}

/** Hàng chia đều nhiều ô (vd Người gửi | Người nhận). */
export function SheetRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}

/** 1 ô của phiếu: "1  NGƯỜI GỬI (Shipper)" + nội dung. */
export function SheetBox({ no, title, aside, children }: { no?: number; title: string; aside?: ReactNode; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className={styles.box}>
      <header className={styles.boxHead}>
        {no !== undefined && <span className={styles.no}>{no}</span>}
        <h3>{t(title)}</h3>
        {aside && <span className={styles.aside}>{aside}</span>}
      </header>
      <div className={styles.boxBody}>{children}</div>
    </section>
  );
}

/** Tên chính trong ô (tên công ty / người). */
export function SheetName({ children }: { children: ReactNode }) {
  return <div className={styles.name}>{children}</div>;
}

/** Các dòng địa chỉ. */
export function SheetLines({ lines }: { lines: ReadonlyArray<string> }) {
  const shown = lines.filter(Boolean);
  if (!shown.length) return null;
  return (
    <div className={styles.lines}>
      {shown.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}

/** Cặp nhãn / giá trị; `columns` = số cột (1 = xếp dọc trong ô hẹp). Giá trị rỗng hiện "—". */
export function SheetFields({ items, columns = 1 }: { items: ReadonlyArray<readonly [label: string, value: ReactNode]>; columns?: 1 | 2 | 3 | 4 }) {
  const { t } = useI18n();
  if (!items.length) return null;
  return (
    <dl className={cx(styles.fields, styles[`cols${columns}`])}>
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{t(k)}</dt>
          <dd>{v === '' || v === null || v === undefined ? '—' : typeof v === 'string' ? t(v) : v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Bảng trong phiếu (kiện, mặt hàng): kẻ ô mảnh, tiêu đề chữ nhỏ. */
export function SheetTable({ head, rows, numeric = [] }: { head: ReadonlyArray<string>; rows: ReadonlyArray<ReadonlyArray<ReactNode>>; numeric?: ReadonlyArray<number> }) {
  const { t } = useI18n();
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>{head.map((h, i) => <th key={i} className={numeric.includes(i) ? styles.num : undefined}>{h && t(h)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>{r.map((c, ci) => <td key={ci} className={numeric.includes(ci) ? styles.num : undefined}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Dòng tổng căn phải dưới bảng: "Nhãn  giá trị" — dòng cuối là tổng chính. */
export function SheetTotals({ items }: { items: ReadonlyArray<readonly [label: string, value: ReactNode]> }) {
  const { t } = useI18n();
  return (
    <dl className={styles.totals}>
      {items.map(([k, v], i) => (
        <div key={k} className={i === items.length - 1 ? styles.totalMain : undefined}>
          <dt>{t(k)}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
