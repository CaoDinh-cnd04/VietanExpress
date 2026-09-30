import { useI18n } from '@/shared/i18n';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, pageSize, onChange }: PaginationProps) {
  const { t } = useI18n();
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  return (
    <nav className={styles.pager} aria-label={t('Phân trang')}>
      <span className={styles.info}>{from}–{to} / {total}</span>
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label={t('Trang trước')}>‹</button>
      <span className={styles.info}>{t('Trang {page}/{total}', { page, total: totalPages })}</span>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label={t('Trang sau')}>›</button>
    </nav>
  );
}
