import { useI18n } from '@/shared/i18n';
import { formatVnd } from '@/shared/lib/format';
import { Button, Modal, Notice } from '@/shared/ui';
import type { ServiceQuote } from '@/features/pricing';
import type { PackageWarning } from '../lib/carrier-limits';
import styles from './form.module.css';

interface SurchargeConfirmDialogProps {
  open: boolean;
  quote: ServiceQuote | null;
  warnings: ReadonlyArray<PackageWarning>;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Xác nhận trước khi tạo đơn có phụ phí / cảnh báo quá khổ, quá tải. */
export function SurchargeConfirmDialog({ open, quote, warnings, busy, onConfirm, onCancel }: SurchargeConfirmDialogProps) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title="Đơn hàng có thể phát sinh phụ phí"
      onClose={onCancel}
      footerNote="Giá là ước tính theo biểu giá hiện hành"
      footer={
        <>
          <Button onClick={onCancel}>{t('Xem lại đơn')}</Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy}>{t(busy ? 'Đang lưu…' : 'Đồng ý tạo đơn')}</Button>
        </>
      }
    >
      <div className={styles.confirm}>
        {quote?.hasSurcharge && (
          <dl className={styles.totals}>
            <div><dt>{t('Phụ thu kích thước / trọng lượng')}</dt><dd className={styles.warnText}>{formatVnd(quote.surcharges)}</dd></div>
            <div><dt>{t('Cước ước tính (gồm FSC, VAT)')}</dt><dd className={styles.emphasis}>{formatVnd(quote.totalFare)}</dd></div>
          </dl>
        )}
        {warnings.map(w => (
          <Notice key={w.title} tone="warning" title={w.title}>{w.detail}</Notice>
        ))}
        <p>{t('Bạn có chắc muốn tiếp tục tạo đơn hàng này?')}</p>
      </div>
    </Modal>
  );
}
