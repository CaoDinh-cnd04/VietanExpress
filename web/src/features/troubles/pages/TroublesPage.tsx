import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, DataTable, Icon, PageHeader, StatusPill, Tabs, type Column } from '@/shared/ui';
import { useTroubles } from '../api';
import { ReportTroubleDialog } from '../components/ReportTroubleDialog';
import { TroubleDetailDialog } from '../components/TroubleDetailDialog';
import { TROUBLE_PRIORITY, TROUBLE_STATUS, TROUBLE_TABS } from '../constants';
import type { TroubleTicket } from '../types';
import styles from '../components/troubles.module.css';

type TabKey = (typeof TROUBLE_TABS)[number]['key'];

const matches = (t: TroubleTicket, tab: TabKey) => (tab === 'all' ? true : tab === 'open' ? t.status !== 'done' : t.status === tab);

const COLUMNS: ReadonlyArray<Column<TroubleTicket>> = [
  { key: 'id', header: 'Mã ticket', width: 110, render: t => <span className="mono">{t.id}</span> },
  { key: 'bill', header: 'Mã vận đơn', render: t => <><div className="mono">{t.bill}</div><div className={styles.cellSub}>{t.cnee}</div></> },
  { key: 'type', header: 'Loại sự cố', render: t => t.type },
  { key: 'lv', header: 'Mức độ', width: 100, render: t => <StatusPill tone={TROUBLE_PRIORITY[t.lv].tone}>{TROUBLE_PRIORITY[t.lv].label}</StatusPill> },
  { key: 'date', header: 'Ngày gửi', width: 160, render: t => <span className="tabular">{t.date}</span> },
  { key: 'status', header: 'Trạng thái', width: 170, render: t => <StatusPill tone={TROUBLE_STATUS[t.status].tone}>{TROUBLE_STATUS[t.status].label}</StatusPill> }
];

/**
 * Quản lý sự cố. Mở từ đơn hàng bằng /troubles?bill=… sẽ bật sẵn hộp báo sự cố cho đơn đó.
 */
export default function TroublesPage() {
  const { data = [], isLoading, isError, refetch } = useTroubles();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<TabKey>('open');
  const [openTicket, setOpenTicket] = useState<TroubleTicket | null>(null);
  const [reporting, setReporting] = useState(false);
  const billParam = params.get('bill');

  const counts = useMemo(() => Object.fromEntries(TROUBLE_TABS.map(t => [t.key, data.filter(x => matches(x, t.key)).length])), [data]);
  const rows = data.filter(t => matches(t, tab));
  // Luôn lấy bản mới nhất từ cache để hộp chi tiết cập nhật sau khi phản hồi
  const current = openTicket ? data.find(t => t.id === openTicket.id) ?? openTicket : null;

  const closeReport = () => {
    setReporting(false);
    if (billParam) setParams({}, { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Quản lý sự cố"
        description="Theo dõi yêu cầu hỗ trợ đã gửi tới CS Việt An và nhắc khi cần."
        actions={<Button variant="primary" size="sm" onClick={() => setReporting(true)}><Icon name="plus" size={15} /> Báo sự cố mới</Button>}
      />
      <Card flush>
        <Tabs ariaLabel="Lọc theo trạng thái" items={TROUBLE_TABS.map(t => ({ ...t, count: counts[t.key] }))} value={tab} onChange={setTab} />
        <DataTable
          caption="Danh sách sự cố"
          columns={COLUMNS}
          rows={rows}
          rowKey={t => t.id}
          loading={isLoading}
          onRowClick={setOpenTicket}
          empty={
            isError
              ? { title: 'Không tải được danh sách sự cố', action: <Button onClick={() => void refetch()}>Thử lại</Button> }
              : { title: 'Không có sự cố nào', description: 'Báo sự cố từ menu "⋯" của đơn trong Đơn hàng của tôi.' }
          }
        />
      </Card>

      <ReportTroubleDialog open={reporting || !!billParam} context={billParam ? { bill: billParam } : null} onClose={closeReport} />
      <TroubleDetailDialog ticket={current} onClose={() => setOpenTicket(null)} />
    </>
  );
}
