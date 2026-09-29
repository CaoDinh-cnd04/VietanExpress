import { useEffect } from 'react';
import { Button, Icon, StatusPill } from '@/shared/ui';
import { useOrderEvents } from '../api';
import { ORDER_STATUS } from '../constants';
import { estimatePodDate } from '../lib/order-utils';
import type { Order, OrderActions } from '../types';
import { TrackingLinks } from './TrackingLinks';
import styles from './OrderDrawer.module.css';

interface OrderDrawerProps {
  order: Order | null;
  onClose: () => void;
  actions: Pick<OrderActions, 'onPhotos' | 'onTrouble'>;
}

/** Ngăn chi tiết đơn trượt từ phải. */
export function OrderDrawer({ order, onClose, actions }: OrderDrawerProps) {
  const events = useOrderEvents(order?.bill ?? null);
  useEffect(() => {
    if (!order) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [order, onClose]);

  if (!order) return null;
  const status = ORDER_STATUS[order.st];
  const rows: Array<[string, string]> = [
    ['Số tham chiếu', order.ref || '—'],
    ['Người nhận', order.cnee],
    ['Nước đến', order.ct],
    ['Dịch vụ', order.route],
    ['Chi nhánh gửi', order.branch],
    ['Loại hàng', order.type],
    ['Kiện / cân', order.pcs],
    ['Hàng hóa', order.content],
    ['Ngày tạo', order.created],
    ['Ngày gửi', order.sent || 'Chưa gửi'],
    ['Mã tracking hãng', order.connect || '—'],
    ['POD', order.pod ? `${order.pod.date} ${order.pod.time} · ${order.pod.signer}` : estimatePodDate(order) ? `Dự kiến ${estimatePodDate(order)}` : '—']
  ];

  return (
    <>
      <div className={styles.scrim} onClick={onClose} />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="order-drawer-title">
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Chi tiết đơn hàng</p>
            <h2 id="order-drawer-title" className={styles.title}>VA Bill <span className="mono">{order.bill}</span></h2>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Đóng">
            <Icon name="close" size={16} />
          </button>
        </header>
        <div className={styles.body}>
          <div className={styles.status}>
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
            <Button size="sm" onClick={() => actions.onPhotos(order)}><Icon name="image" size={15} /> Ảnh kiện</Button>
            <Button size="sm" variant="danger" onClick={() => actions.onTrouble(order)}><Icon name="alert" size={15} /> Báo sự cố</Button>
          </div>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Tracking</h3>
            <TrackingLinks bill={order.bill} />
          </section>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Hành trình</h3>
            {events.data?.length ? (
              <ol className={styles.timeline}>
                {events.data.map((ev, i) => (
                  <li key={`${ev.time}-${i}`} className={i === 0 ? styles.now : undefined}>
                    <strong>{ev.title}</strong>
                    <span>{ev.time}{ev.location ? ` · ${ev.location}` : ''}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.muted}>{events.isLoading ? 'Đang tải…' : 'Chưa có cập nhật hành trình — xem chi tiết qua VA Track.'}</p>
            )}
          </section>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Thông tin đơn</h3>
            <dl className={styles.kv}>
              {rows.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </section>
        </div>
      </aside>
    </>
  );
}
