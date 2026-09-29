import { useCallback, useMemo, useState } from 'react';
import { Button, Card, EmptyState, LinkButton, PageHeader, Pagination, Tabs } from '@/shared/ui';
import { useOrders } from '../api';
import { ReportTroubleDialog } from '@/features/troubles';
import { OrderDrawer } from '../components/OrderDrawer';
import { OrderPhotosDialog } from '../components/OrderPhotosDialog';
import { OrderFilterBar } from '../components/OrderFilterBar';
import { OrderSummaryBar } from '../components/OrderSummaryBar';
import { OrdersTable } from '../components/OrdersTable';
import { STATUS_TABS } from '../constants';
import { useOrderFilters } from '../hooks/useOrderFilters';
import { useExportOrders, usePrintDocuments } from '../mutations';
import type { Order, OrderActions, OrderSortField } from '../types';
import styles from './OrdersPage.module.css';

export default function OrdersPage() {
  const print = usePrintDocuments();
  const exportOrders = useExportOrders();
  const { filters, update, reset } = useOrderFilters();
  const { data, isFetching, isError, refetch } = useOrders(filters);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openOrder, setOpenOrder] = useState<Order | null>(null);
  const [photoOrder, setPhotoOrder] = useState<Order | null>(null);
  const [troubleOrder, setTroubleOrder] = useState<Order | null>(null);
  const actions = useMemo<OrderActions>(() => ({ onOpen: setOpenOrder, onPhotos: setPhotoOrder, onTrouble: setTroubleOrder }), []);

  const items = data?.items ?? [];
  const summary = data?.summary;

  const onSort = (field: OrderSortField) =>
    update({ sortBy: field, sortDir: filters.sortBy === field && filters.sortDir === 'asc' ? 'desc' : 'asc' });

  const toggle = (bill: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(bill)) next.delete(bill);
      else next.add(bill);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelected(prev => {
      const next = new Set(prev);
      items.forEach(o => (checked ? next.add(o.bill) : next.delete(o.bill)));
      return next;
    });

  const closeDrawer = useCallback(() => setOpenOrder(null), []);

  return (
    <>
      <PageHeader
        title="Đơn hàng của tôi"
        description="Tra cứu, theo dõi và in bill các đơn đã tạo."
        actions={<LinkButton to="/orders/new" variant="primary" size="sm">Tạo đơn mới</LinkButton>}
      />

      <OrderFilterBar filters={filters} onChange={update} onReset={reset} />

      <Card flush>
        <Tabs
          ariaLabel="Lọc theo trạng thái"
          value={filters.status}
          onChange={status => update({ status })}
          items={STATUS_TABS.map(t => ({ ...t, count: summary?.statusCounts[t.key] }))}
        />
        <OrderSummaryBar
          totalPieces={summary?.totalPieces ?? 0}
          totalWeight={summary?.totalWeight ?? 0}
          totalRows={data?.total ?? 0}
          selectedCount={selected.size}
          pageSize={filters.pageSize}
          onPageSizeChange={pageSize => update({ pageSize })}
          onBulkPrint={() => void print([...selected], 'bill-a4')}
          onExport={() => exportOrders.mutate(filters)}
          exporting={exportOrders.isPending}
        />

        {isError ? (
          <EmptyState
            title="Không tải được danh sách đơn"
            description="Kiểm tra kết nối tới máy chủ rồi thử lại."
            action={<Button onClick={() => void refetch()}>Thử lại</Button>}
          />
        ) : (
          <OrdersTable
            orders={items}
            offset={((data?.page ?? 1) - 1) * filters.pageSize}
            sortBy={filters.sortBy}
            sortDir={filters.sortDir}
            onSort={onSort}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
            actions={actions}
            loading={isFetching}
          />
        )}

        <footer className={styles.footer}>
          <span>{data?.total ?? 0} đơn hàng</span>
          {data && (
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onChange={page => update({ page })} />
          )}
        </footer>
      </Card>

      <OrderDrawer order={openOrder} onClose={closeDrawer} actions={actions} />
      <OrderPhotosDialog order={photoOrder} onClose={() => setPhotoOrder(null)} />
      <ReportTroubleDialog
        open={!!troubleOrder}
        context={troubleOrder && { bill: troubleOrder.bill, cnee: troubleOrder.cnee, ct: troubleOrder.ct }}
        onClose={() => setTroubleOrder(null)}
      />
    </>
  );
}
