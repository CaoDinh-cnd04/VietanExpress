import { Card, Notice, StatCard, StatGrid } from '@/shared/ui';
import { useEcomOrders } from '../api';
import { ECOM_SOURCES } from '../constants';
import type { EcomSource } from '../types';
import styles from './ecommerce.module.css';

/** Tab Tổng quan: số liệu tính từ danh sách đơn e-com. */
export function EcomOverview() {
  const { data: orders = [] } = useEcomOrders();
  const count = (pred: (st: string) => boolean) => orders.filter(o => pred(o.st)).length;
  const bySource = (Object.keys(ECOM_SOURCES) as EcomSource[])
    .map(src => ({ src, n: orders.filter(o => o.src === src).length }))
    .filter(x => x.n > 0);

  return (
    <div className="page-stack">
      <StatGrid>
        <StatCard label="Tổng đơn e-com" value={orders.length} tone="brand" icon="bag" />
        <StatCard label="Tạo thành công" value={count(st => st !== 'exception' && st !== 'weighing')} icon="check" />
        <StatCard label="Lỗi cần xử lý" value={count(st => st === 'exception')} tone="danger" icon="alert" />
        <StatCard label="Chờ cân đo" value={count(st => st === 'weighing')} tone="warning" icon="clock" />
      </StatGrid>
      <Card title="Theo nguồn">
        <div className={styles.sources}>
          {bySource.length ? bySource.map(({ src, n }) => (
            <span key={src} className={styles.sourceTag}>{ECOM_SOURCES[src].label} <strong>{n}</strong></span>
          )) : <span className={styles.muted}>Chưa có đơn.</span>}
        </div>
        <div className={styles.spaced}>
          <Notice>
            Đơn tạo qua API / Excel được cấp mã bill Việt An ngay và trả nhãn (A6 / A4 / ZPL). Đơn thiếu cân hoặc kích thước ở trạng thái
            <strong> Chờ cân đo</strong> — kho Việt An cân xong sẽ cập nhật cước.
          </Notice>
        </div>
      </Card>
    </div>
  );
}
