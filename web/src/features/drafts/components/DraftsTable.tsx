import { useState } from 'react';
import { Button, DataTable, Icon, LinkButton, StatusPill, type Column } from '@/shared/ui';
import { useDeleteDraft, useDrafts, usePrintDraft, type Draft } from '../api';
import styles from '../pages/DraftsPage.module.css';
import { DraftDetailModal } from './DraftDetailModal';

/** Bảng đơn nháp & chưa in: Xem · Sửa · In & cấp bill · Xóa. Dùng ở trang Đơn nháp và dưới form tạo đơn 1 trang. */
export function DraftsTable({ limit }: { limit?: number }) {
  const { data = [], isLoading, isError, refetch } = useDrafts();
  const print = usePrintDraft();
  const remove = useDeleteDraft();
  const rows = limit ? data.slice(0, limit) : data;
  const [viewing, setViewing] = useState<Draft | null>(null);

  const columns: ReadonlyArray<Column<Draft>> = [
    { key: 'st', header: 'Trạng thái', width: 100, render: d => (d.stt === 'ready' ? <StatusPill tone="info">Chưa in</StatusPill> : <StatusPill>Nháp</StatusPill>) },
    {
      key: 'cnee',
      header: 'Người nhận',
      render: d => <button type="button" className={styles.link} onClick={() => setViewing(d)}>{d.cnee || '—'}</button>
    },
    { key: 'ct', header: 'Nước đến', render: d => d.ct },
    { key: 'svc', header: 'Dịch vụ', render: d => <span className={styles.muted}>{d.service}</span> },
    { key: 'pcs', header: 'Kiện / cân', render: d => d.pcs },
    { key: 'content', header: 'Nội dung', render: d => d.content },
    { key: 'date', header: 'Tạo lúc', render: d => <span className={`${styles.muted} tabular`}>{d.date}</span> },
    {
      key: 'act',
      header: 'Thao tác',
      width: 320,
      render: d => {
        const ready = d.stt === 'ready';
        const printing = print.isPending && print.variables === d.id;
        return (
          <div className={styles.actions}>
            <Button size="sm" onClick={() => setViewing(d)}><Icon name="eye" size={15} /> Xem</Button>
            <LinkButton size="sm" to={`/orders/new/quick?draft=${encodeURIComponent(d.id)}`}><Icon name="edit" size={15} /> {ready ? 'Sửa' : 'Tiếp tục'}</LinkButton>
            <Button size="sm" variant="primary" onClick={() => print.mutate(d.id)} disabled={!ready || printing} title={ready ? undefined : 'Hoàn thiện đơn trước khi in'}>
              {printing ? 'Đang in…' : 'In & cấp bill'}
            </Button>
            <Button size="sm" iconOnly variant="danger" onClick={() => remove.mutate(d.id)} aria-label={`Xóa đơn nháp ${d.cnee}`}>
              <Icon name="trash" size={15} />
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <>
      <DataTable
        caption="Đơn nháp và chưa in"
        columns={columns}
        rows={rows}
        rowKey={d => d.id}
        loading={isLoading}
        minWidth={960}
        empty={
          isError
            ? { title: 'Không tải được đơn nháp', action: <Button onClick={() => void refetch()}>Thử lại</Button> }
            : { title: 'Chưa có đơn nháp', description: 'Đơn đang làm dở hoặc chưa in sẽ hiện ở đây.' }
        }
      />
      <DraftDetailModal
        draft={viewing}
        onClose={() => setViewing(null)}
        printing={print.isPending && print.variables === viewing?.id}
        onPrint={d => print.mutate(d.id, { onSuccess: () => setViewing(null) })}
      />
    </>
  );
}
