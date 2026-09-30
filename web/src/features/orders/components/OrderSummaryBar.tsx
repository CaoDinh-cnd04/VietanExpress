import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { PAGE_SIZES } from '../constants';
import styles from './OrderSummaryBar.module.css';

interface OrderSummaryBarProps {
  totalPieces: number;
  totalWeight: number;
  totalRows: number;
  selectedCount: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onBulkPrint: () => void;
  onExport: () => void;
  /** Đang tạo file bảng kê. */
  exporting?: boolean;
}

/** Tổng kiện · Tổng cân · Kết quả (như bản cũ) + thao tác hàng loạt. */
export function OrderSummaryBar(p: OrderSummaryBarProps) {
  const { t } = useI18n();
  const fmt = new Intl.NumberFormat('vi-VN');
  return (
    <div className={styles.bar}>
      <dl className={styles.kpis}>
        <div><dt>{t('Tổng kiện')}</dt><dd>{fmt.format(p.totalPieces)}</dd></div>
        <div><dt>{t('Tổng cân')}</dt><dd>{fmt.format(p.totalWeight)} kg</dd></div>
        <div><dt>{t('Kết quả')}</dt><dd>{fmt.format(p.totalRows)}</dd></div>
      </dl>
      <div className={styles.actions}>
        <label className={styles.pageSize}>
          {t('Hiển thị')}
          <select value={p.pageSize} onChange={e => p.onPageSizeChange(Number(e.target.value))}>
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <Button size="sm" onClick={p.onBulkPrint} disabled={!p.selectedCount}>
          {p.selectedCount ? t('In nhiều bill ({n})', { n: p.selectedCount }) : t('In nhiều bill')}
        </Button>
        <Button size="sm" onClick={p.onExport} disabled={p.exporting}>
          {t(p.exporting ? 'Đang xuất…' : 'Xuất bảng kê gửi hàng')}
        </Button>
      </div>
    </div>
  );
}
