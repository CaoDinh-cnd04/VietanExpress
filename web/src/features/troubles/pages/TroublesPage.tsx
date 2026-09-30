import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '@/shared/i18n';
import { Button, Card, DataTable, Icon, PageHeader, StatusPill, Tabs, type Column } from '@/shared/ui';
import { useTroubles } from '../api';
import { ReportTroubleDialog } from '../components/ReportTroubleDialog';
import { TroubleDetailDialog } from '../components/TroubleDetailDialog';
import { TROUBLE_PRIORITY, TROUBLE_STATUS, TROUBLE_TABS } from '../constants';
import type { TroubleTicket } from '../types';
import styles from '../components/troubles.module.css';

type TabKey = (typeof TROUBLE_TABS)[number]['key'];

const matches = (t: TroubleTicket, tab: TabKey) => (tab === 'all' ? true : tab === 'open' ? t.status !== 'done' : t.status === tab);

const columns = (t: (text: string) => string): ReadonlyArray<Column<TroubleTicket>> => [
  { key: 'id', header: 'Mã ticket', width: 110, render: x => <span className="mono">{x.id}</span> },
  { key: 'bill', header: 'Mã vận đơn', render: x => <><div className="mono">{x.bill}</div><div className={styles.cellSub}>{x.cnee}</div></> },
  { key: 'type', header: 'Loại sự cố', render: x => t(x.type) },
  { key: 'lv', header: 'Mức độ', width: 100, render: x => <StatusPill tone={TROUBLE_PRIORITY[x.lv].tone}>{TROUBLE_PRIORITY[x.lv].label}</StatusPill> },
  { key: 'date', header: 'Ngày gửi', width: 160, render: x => <span className="tabular">{x.date}</span> },
  { key: 'status', header: 'Trạng thái', width: 170, render: x => <StatusPill tone={TROUBLE_STATUS[x.status].tone}>{TROUBLE_STATUS[x.status].label}</StatusPill> }
];

/**
 * Quản lý sự cố. Mở từ đơn hàng bằng /troubles?bill=… sẽ bật sẵn hộp báo sự cố cho đơn đó.
 */
export default function TroublesPage() {
  const { t } = useI18n();
  const { data = [], isLoading, isError, refetch } = useTroubles();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<TabKey>('open');
  const [openTicket, setOpenTicket] = useState<TroubleTicket | null>(null);
  const [reporting, setReporting] = useState(false);
  const billParam = params.get('bill');

  const counts = useMemo(() => Object.fromEntries(TROUBLE_TABS.map(tab => [tab.key, data.filter(x => matches(x, tab.key)).length])), [data]);
  const rows = data.filter(x => matches(x, tab));
  // Luôn lấy bản mới nhất từ cache để hộp chi tiết cập nhật sau khi phản hồi
  const current = openTicket ? data.find(x => x.id === openTicket.id) ?? openTicket : null;

  const closeReport = () => {
    setReporting(false);
    if (billParam) setParams({}, { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Quản lý sự cố"
        description="Theo dõi yêu cầu hỗ trợ đã gửi tới CS Việt An và nhắc khi cần."
        actions={<Button variant="primary" size="sm" onClick={() => setReporting(true)}><Icon name="plus" size={15} /> {t('Báo sự cố mới')}</Button>}
      />
      <Card flush>
        <Tabs ariaLabel={t('Lọc theo trạng thái')} items={TROUBLE_TABS.map(tab => ({ ...tab, count: counts[tab.key] }))} value={tab} onChange={setTab} />
        <DataTable
          caption="Danh sách sự cố"
          columns={columns(t)}
          rows={rows}
          rowKey={x => x.id}
          loading={isLoading}
          onRowClick={setOpenTicket}
          empty={
            isError
              ? { title: 'Không tải được danh sách sự cố', action: <Button onClick={() => void refetch()}>{t('Thử lại')}</Button> }
              : { title: 'Không có sự cố nào', description: 'Báo sự cố từ menu "⋯" của đơn trong Đơn hàng của tôi.' }
          }
        />
      </Card>

      <ReportTroubleDialog open={reporting || !!billParam} context={billParam ? { bill: billParam } : null} onClose={closeReport} />
      <TroubleDetailDialog ticket={current} onClose={() => setOpenTicket(null)} />
    </>
  );
}
