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
  if (!draft) return null;
  const d = draftDetail(draft.payload);
  const ready = draft.stt === 'ready';

  return (
    <Modal
      open
      size="lg"
      title={`Chi tiết đơn — ${draft.cnee || 'chưa có người nhận'}`}
      onClose={onClose}
      footerNote={<span className={styles.muted}>Tạo lúc {draft.date}</span>}
      footer={
        <>
          <LinkButton size="sm" to={`/orders/new/quick?draft=${encodeURIComponent(draft.id)}`}>
            <Icon name="edit" size={15} /> {ready ? 'Sửa' : 'Tiếp tục'}
          </LinkButton>
          <Button size="sm" variant="primary" disabled={!ready || printing} onClick={() => onPrint(draft)}>
            {printing ? 'Đang in…' : 'In & cấp bill'}
          </Button>
        </>
      }
    >
      <div className={styles.status}>
        {ready ? <StatusPill tone="info">Chưa in</StatusPill> : <StatusPill>Nháp — chưa khai đủ</StatusPill>}
      </div>

      <div className={styles.cols}>
        <section>
          <h3 className={styles.heading}>Người gửi</h3>
          <KeyValueList items={d.shipper} />
        </section>
        <section>
          <h3 className={styles.heading}>Người nhận</h3>
          <KeyValueList items={d.receiver} />
        </section>
      </div>

      <section>
        <h3 className={styles.heading}>Dịch vụ & hàng hóa</h3>
        <KeyValueList items={d.shipment} />
      </section>

      {d.packages.length > 0 && (
        <section>
          <h3 className={styles.heading}>Chi tiết kiện</h3>
          <table className={styles.table}>
            <thead>
              <tr><th>SL</th><th>Bao bì</th><th>Kích thước</th><th className={styles.num}>Cân 1 kiện</th></tr>
            </thead>
            <tbody>
              {d.packages.map((p, i) => (
                <tr key={i}><td>{p.qty}</td><td>{p.packaging}</td><td>{p.size}</td><td className={styles.num}>{p.weight}</td></tr>
              ))}
            </tbody>
          </table>
          {d.packageTotals && (
            <p className={styles.total}>
              {d.packageTotals.pieces} kiện · cân thực {fmt(d.packageTotals.grossWeight)} kg · quy đổi {fmt(d.packageTotals.volumetricWeight)} kg ·{' '}
              <strong>cân tính cước {fmt(d.packageTotals.chargeableWeight)} kg</strong>
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
              <tr><th>Tên hàng</th><th>HS</th><th>Xuất xứ</th><th>Số lượng</th><th className={styles.num}>Đơn giá</th><th className={styles.num}>Thành tiền</th></tr>
            </thead>
            <tbody>
              {d.items.map((it, i) => (
                <tr key={i}>
                  <td>{it.desc}</td><td>{it.hs}</td><td>{it.origin}</td><td>{it.qty}</td>
                  <td className={styles.num}>{it.price}</td><td className={styles.num}>{fmt(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.total}><strong>Tổng giá trị invoice: {fmt(d.invoiceTotal)} {d.currency}</strong></p>
        </section>
      )}
    </Modal>
  );
}
