import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, pageSize, onChange }: PaginationProps) {
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  return (
    <nav className={styles.pager} aria-label="Phân trang">
      <span className={styles.info}>{from}–{to} / {total}</span>
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Trang trước">‹</button>
      <span className={styles.info}>Trang {page}/{totalPages}</span>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Trang sau">›</button>
    </nav>
  );
}
