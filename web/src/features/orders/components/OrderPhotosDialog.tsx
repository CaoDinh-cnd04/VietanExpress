import { isNotImplemented } from '@/shared/api/http';
import { EmptyState, Modal, Notice } from '@/shared/ui';
import { useOrderPhotos } from '../api';
import type { Order } from '../types';
import styles from './OrderPhotosDialog.module.css';

/** Ảnh kiện chụp trên cân tại kho — căn cứ đối chiếu khối lượng & tình trạng hàng. */
export function OrderPhotosDialog({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const photos = useOrderPhotos(order?.bill ?? null);

  return (
    <Modal open={!!order} size="lg" title={order ? `Ảnh kiện hàng · ${order.bill}` : ''} onClose={onClose}>
      {photos.isLoading ? (
        <p className={styles.muted}>Đang tải ảnh…</p>
      ) : photos.isError ? (
        <Notice tone={isNotImplemented(photos.error) ? 'warning' : 'danger'}>
          {isNotImplemented(photos.error) ? 'Chức năng xem ảnh đang được kết nối máy chủ.' : 'Không tải được ảnh, vui lòng thử lại.'}
        </Notice>
      ) : !photos.data?.length ? (
        <EmptyState title="Đơn chưa có ảnh kiện hàng" description="Ảnh sẽ có sau khi kho Việt An nhận và cân hàng." />
      ) : (
        <div className={styles.grid}>
          {photos.data.map((p, i) => (
            <figure key={p.url} className={styles.card}>
              <a href={p.url} target="_blank" rel="noreferrer">
                <img src={p.url} alt={p.caption ?? `Ảnh kiện ${i + 1}`} loading="lazy" />
              </a>
              <figcaption>{p.caption ?? `Kiện ${i + 1}`}{p.takenAt ? ` · ${p.takenAt}` : ''}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </Modal>
  );
}
