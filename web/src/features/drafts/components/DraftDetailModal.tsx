import { useI18n } from '@/shared/i18n';
import { Button, Icon, KeyValueList, LinkButton, Modal, StatusPill } from '@/shared/ui';
import type { Draft } from '../api';
import { draftDetail } from '../lib/draft-detail';
import styles from './DraftDetailModal.module.css';

interface DraftDetailModalProps {
  draft: Draft | null;
  onClose: () => void;
  onPrint: (draft: Draft) => void;
  printing: boolean;
}

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

/** Xem toàn bộ thông tin đơn nháp / chưa in (form đã lưu) trước khi sửa hoặc in. */
export function DraftDetailModal({ draft, onClose, onPrint, printing }: DraftDetailModalProps) {
  const { t } = useI18n();
  if (!draft) return null;
  const d = draftDetail(draft.payload);
  const ready = draft.stt === 'ready';

  return (
    <Modal
      open
      size="lg"
      title={t('Chi tiết đơn — {name}', { name: draft.cnee || t('chưa có người nhận') })}
      onClose={onClose}
      footerNote={<span className={styles.muted}>{t('Tạo lúc {date}', { date: draft.date })}</span>}
      footer={
        <>
          <LinkButton size="sm" to={`/orders/new/quick?draft=${encodeURIComponent(draft.id)}`}>
            <Icon name="edit" size={15} /> {t(ready ? 'Sửa' : 'Tiếp tục')}
          </LinkButton>
          <Button size="sm" variant="primary" disabled={!ready || printing} onClick={() => onPrint(draft)}>
            {t(printing ? 'Đang in…' : 'In & cấp bill')}
          </Button>
        </>
      }
    >
      <div className={styles.status}>
        {ready ? <StatusPill tone="info">{t('Chưa in')}</StatusPill> : <StatusPill>{t('Nháp — chưa khai đủ')}</StatusPill>}
      </div>

      <div className={styles.cols}>
        <section>
          <h3 className={styles.heading}>{t('Người gửi')}</h3>
          <KeyValueList items={d.shipper} />
        </section>
        <section>
          <h3 className={styles.heading}>{t('Người nhận')}</h3>
          <KeyValueList items={d.receiver} />
        </section>
      </div>

      <section>
        <h3 className={styles.heading}>{t('Dịch vụ & hàng hóa')}</h3>
        <KeyValueList items={d.shipment} />
      </section>

      {d.packages.length > 0 && (
        <section>
          <h3 className={styles.heading}>{t('Chi tiết kiện')}</h3>
          <table className={styles.table}>
            <thead>
              <tr><th>{t('SL')}</th><th>{t('Bao bì')}</th><th>{t('Kích thước')}</th><th className={styles.num}>{t('Cân 1 kiện')}</th></tr>
            </thead>
            <tbody>
              {d.packages.map((p, i) => (
                <tr key={i}><td>{p.qty}</td><td>{t(p.packaging)}</td><td>{p.size}</td><td className={styles.num}>{p.weight}</td></tr>
              ))}
            </tbody>
          </table>
          {d.packageTotals && (
            <p className={styles.total}>
              {t('{n} kiện · cân thực {gross} kg · quy đổi {vol} kg', { n: d.packageTotals.pieces, gross: fmt(d.packageTotals.grossWeight), vol: fmt(d.packageTotals.volumetricWeight) })} ·{' '}
              <strong>{t('cân tính cước {kg} kg', { kg: fmt(d.packageTotals.chargeableWeight) })}</strong>
            </p>
          )}
        </section>
      )}

      {d.items.length > 0 && (
        <section>
          <h3 className={styles.heading}>Invoice</h3>
          <KeyValueList items={d.invoice} />
          <table className={styles.table}>
            <thead>
              <tr><th>{t('Tên hàng')}</th><th>HS</th><th>{t('Xuất xứ')}</th><th>{t('Số lượng')}</th><th className={styles.num}>{t('Đơn giá')}</th><th className={styles.num}>{t('Thành tiền')}</th></tr>
            </thead>
            <tbody>
              {d.items.map((it, i) => (
                <tr key={i}>
                  <td>{it.desc}</td><td>{it.hs}</td><td>{it.origin}</td><td>{t(it.qty)}</td>
                  <td className={styles.num}>{it.price}</td><td className={styles.num}>{fmt(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.total}><strong>{t('Tổng giá trị invoice: {total} {currency}', { total: fmt(d.invoiceTotal), currency: d.currency })}</strong></p>
        </section>
      )}
    </Modal>
  );
}
