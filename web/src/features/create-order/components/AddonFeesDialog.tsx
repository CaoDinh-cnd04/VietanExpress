import { isNotImplemented } from '@/shared/api/http';
import { useI18n } from '@/shared/i18n';
import { Button, Modal, Notice } from '@/shared/ui';
import { useAddonFees } from '../api';
import { ADDONS } from '../constants';
import { addonFeeRows } from '../lib/addon-fees';
import styles from './form.module.css';

/**
 * Biểu phí các tùy chọn dịch vụ (có tính phí). Danh sách dịch vụ lấy từ form; phí lấy từ backend
 * (GET /catalog/addon-fees) — chưa có endpoint / chưa có giá thì hiện "Đang cập nhật", không dùng số liệu giả.
 */
export function AddonFeesDialog({ open, onClose, selected }: { open: boolean; onClose: () => void; selected: readonly string[] }) {
  const { t } = useI18n();
  const fees = useAddonFees(open);
  const rows = addonFeeRows(ADDONS, fees.data);
  const pending = fees.isError && isNotImplemented(fees.error);

  return (
    <Modal
      open={open}
      size="lg"
      title="Biểu phí tùy chọn dịch vụ"
      onClose={onClose}
      footerNote={t('Phí được cộng vào cước khi cấp bill. Giá có thể thay đổi theo hãng và tuyến.')}
      footer={<Button onClick={onClose}>{t('Đóng')}</Button>}
    >
      {pending && (
        <Notice tone="info" title={t('Biểu phí đang được cập nhật')}>
          {t('Giá từng dịch vụ sẽ hiện tại đây khi hệ thống cập nhật xong. Cần báo giá ngay, vui lòng liên hệ CS Việt An.')}
        </Notice>
      )}
      {fees.isError && !pending && <Notice tone="danger">{t('Không tải được biểu phí, vui lòng thử lại sau.')}</Notice>}
      <div className={`${styles.tableScroll} ${styles.spaced}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('Dịch vụ')}</th>
              <th className={styles.colFee}>{t('Phí')}</th>
              <th>{t('Ghi chú')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.name} className={selected.includes(r.name) ? styles.feeRowOn : undefined}>
                <td>
                  <strong className={styles.feeName}>{t(r.name)}</strong>
                  <div className={styles.feeDesc}>{t(r.description)}</div>
                </td>
                <td className={styles.colFee}>
                  {fees.isLoading ? <span className={styles.feePending}>{t('Đang tải…')}</span>
                    : r.price ? <strong className={styles.feeValue}>{t(r.price)}</strong>
                    : <span className={styles.feePending}>{t('Đang cập nhật')}</span>}
                </td>
                <td className={styles.feeDesc}>{r.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
