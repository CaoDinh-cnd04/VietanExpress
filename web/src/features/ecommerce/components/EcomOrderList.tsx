import { useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { downloadTextFile, toCsv } from '@/shared/lib/files';
import { formatNumber } from '@/shared/lib/format';
import { useDebouncedCallback } from '@/shared/lib/useDebouncedCallback';
import { Button, Card, DataTable, EmptyState, Icon, LinkButton, StatusPill, type Column } from '@/shared/ui';
import { useEcomOrders, usePrintEcomLabels, useStoreConnections, useSyncStore } from '../api';
import { ECOM_SOURCES, LABEL_FORMATS, STORE_PLATFORMS } from '../constants';
import { ORDER_VIEWS, countByView, displayStatus, filterByView, formatMoney, type OrderView } from '../lib/order-view';
import { formatSyncTime, needsReauthorize } from '../lib/store-connection';
import type { EcomOrder, EcomSource, StoreConnection } from '../types';
import { DeleteOrdersModal } from './DeleteOrdersModal';
import { EcomOrderDrawer } from './EcomOrderDrawer';
import styles from './ecommerce.module.css';

/** Tab "Đơn hàng": shop đã kết nối + đồng bộ, lọc theo việc cần làm, tìm kiếm, chọn nhiều để in nhãn / xuất Excel, bấm dòng xem chi tiết. */
export function EcomOrderList() {
  const { t } = useI18n();
  const [view, setView] = useState<OrderView>('all');
  const [src, setSrc] = useState<EcomSource | 'all'>('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [format, setFormat] = useState<string>(LABEL_FORMATS[0]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<EcomOrder[]>([]);
  const debouncedSearch = useDebouncedCallback(setQ, 300);
  const all = useEcomOrders();
  const { data: fetched = [], isFetching } = useEcomOrders(src, q);
  const stores = useStoreConnections();
  const print = usePrintEcomLabels();

  const allOrders = all.data ?? [];
  // Đọc từ danh sách mới nhất → sửa xong ngăn chi tiết hiện ngay dữ liệu mới.
  const opened = allOrders.find(o => o.id === openedId) ?? fetched.find(o => o.id === openedId) ?? null;
  const connected = stores.data ?? [];
  const counts = countByView(fetched);
  const rows = filterByView(fetched, view);
  const sources = [...new Set(allOrders.map(o => o.src))];

  const clearSelection = () => setSelected(new Set());
  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const allChecked = rows.length > 0 && rows.every(r => selected.has(r.id));

  const exportCsv = () =>
    downloadTextFile(
      'don-ecommerce.csv',
      toCsv([
        ['Nguồn', 'Mã đơn shop', 'VA Bill', 'Người nhận', 'Nước đến', 'Số SP', 'Cân (kg)', 'Giá trị', 'Tiền tệ', 'Trạng thái', 'Ghi chú', 'Ngày đặt'].map(h => t(h)),
        ...rows.map(o => [t(ECOM_SOURCES[o.src]?.label ?? o.src), o.ref, o.bill, o.cnee, o.ct, o.items, o.kg, o.value ?? '', o.currency ?? '', t(displayStatus(o).label), o.note ?? '', o.createdAt])
      ])
    );

  const columns: ReadonlyArray<Column<EcomOrder>> = [
    {
      key: 'chk',
      width: 40,
      header: <input type="checkbox" aria-label={t('Chọn tất cả')} checked={allChecked} onChange={e => setSelected(e.target.checked ? new Set(rows.map(r => r.id)) : new Set())} />,
      render: o => (
        <input type="checkbox" aria-label={t('Chọn đơn {bill}', { bill: o.ref })} checked={selected.has(o.id)} onClick={e => e.stopPropagation()} onChange={() => toggle(o.id)} />
      )
    },
    {
      key: 'ref',
      header: 'Đơn shop',
      render: o => (
        <>
          <div className={cx(styles.strong, 'mono')}>{o.ref}</div>
          <div className={styles.sub}>{t(ECOM_SOURCES[o.src]?.label ?? o.src)} · {o.createdAt}</div>
        </>
      )
    },
    {
      key: 'cnee',
      header: 'Người nhận',
      render: o => (
        <>
          <div className={styles.strong}>{o.cnee || <span className={styles.muted}>{t('Chưa có tên')}</span>}</div>
          <div className={styles.sub}>{[o.receiver?.city, o.ct].filter(Boolean).join(', ')}</div>
        </>
      )
    },
    {
      key: 'goods',
      header: 'Hàng',
      render: o => (
        <>
          <div>{t('{n} SP', { n: o.items })}</div>
          <div className={styles.sub}>{o.kg ? `${formatNumber(o.kg)} kg` : <span className={styles.warnText}>{t('chờ cân')}</span>}</div>
        </>
      )
    },
    { key: 'value', header: 'Giá trị', align: 'right', render: o => <span className="mono">{formatMoney(o.value, o.currency, formatNumber) || '—'}</span> },
    { key: 'bill', header: 'VA Bill', render: o => (o.bill ? <span className="mono">{o.bill}</span> : <span className={styles.muted}>—</span>) },
    {
      key: 'st',
      header: 'Trạng thái',
      render: o => {
        const s = displayStatus(o);
        return (
          <>
            <StatusPill tone={s.tone}>{t(s.label)}</StatusPill>
            {!o.bill && o.issues?.[0] && (
              <div className={styles.issueText}>
                {t(o.issues[0])}
                {o.issues.length > 1 && <> {t('(+{n} việc)', { n: o.issues.length - 1 })}</>}
              </div>
            )}
            {o.note && <div className={cx(styles.sub, styles.note)}>{o.note}</div>}
          </>
        );
      }
    }
  ];

  const filtering = view !== 'all' || src !== 'all' || !!q;

  return (
    <div className="page-stack">
      {connected.length > 0 && <StoreSyncBar stores={connected} />}

      <Card>
        <div className={styles.listHead}>
          <div className={styles.views} role="group" aria-label={t('Lọc nhanh')}>
            {ORDER_VIEWS.map(v => (
              <button
                key={v.key}
                type="button"
                className={cx(styles.view, view === v.key && styles.viewActive, v.key === 'exception' && counts.exception > 0 && styles.viewAlert)}
                aria-pressed={view === v.key}
                onClick={() => { setView(v.key); clearSelection(); }}
              >
                {t(v.label)} <span className={styles.viewCount}>{counts[v.key]}</span>
              </button>
            ))}
          </div>
          <div className={styles.listTools}>
            <div className={styles.search}>
              <Icon name="search" size={16} />
              <input
                aria-label={t('Tìm đơn E-commerce')}
                placeholder={t('Tìm mã đơn, VA Bill, người nhận…')}
                value={search}
                onChange={e => { setSearch(e.target.value); debouncedSearch(e.target.value); }}
              />
            </div>
            {sources.length > 1 && (
              <select className={styles.inlineSelect} aria-label={t('Nguồn đơn')} value={src} onChange={e => { setSrc(e.target.value as EcomSource | 'all'); clearSelection(); }}>
                <option value="all">{t('Mọi nguồn')}</option>
                {sources.map(s => <option key={s} value={s}>{t(ECOM_SOURCES[s]?.label ?? s)}</option>)}
              </select>
            )}
            <Button iconOnly aria-label={t('Xuất Excel')} title={t('Xuất Excel')} onClick={exportCsv} disabled={!rows.length}><Icon name="download" size={16} /></Button>
          </div>
        </div>

        {selected.size > 0 && (
          <div className={styles.selectionBar}>
            <strong>{t('Đã chọn {n} đơn', { n: selected.size })}</strong>
            <select className={styles.inlineSelect} aria-label={t('Khổ nhãn')} value={format} onChange={e => setFormat(e.target.value)}>
              {LABEL_FORMATS.map(f => <option key={f} value={f}>{t('Khổ {f}', { f })}</option>)}
            </select>
            <Button variant="primary" size="sm" disabled={print.isPending} onClick={() => print.mutate({ ids: [...selected], format })}>
              <Icon name="printer" size={15} /> {t('In nhãn')}
            </Button>
            <Button size="sm" onClick={() => setDeleting(fetched.filter(o => selected.has(o.id)))}>
              <Icon name="trash" size={15} /> {t('Xóa')}
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>{t('Bỏ chọn')}</Button>
          </div>
        )}

        {!all.isLoading && !allOrders.length ? (
          connected.length > 0 ? (
            <EmptyState
              title="Chưa có đơn cần giao"
              description="Đơn chưa giao trên shop đã kết nối sẽ về đây khi đồng bộ. Đơn bán ngoài sàn thì thêm tay hoặc từ file."
              action={<LinkButton to="?tab=add" size="sm"><Icon name="plus" size={15} /> {t('Thêm đơn')}</LinkButton>}
            />
          ) : (
            <EmptyState
              title="Chưa có đơn nào"
              description="Kết nối Shopify để đơn tự về, hoặc thêm đơn tay / từ file Excel."
              action={
                <div className={styles.emptyActions}>
                  <LinkButton to="?tab=add" size="sm">{t('Thêm đơn')}</LinkButton>
                  <LinkButton to="?tab=connect" size="sm" variant="primary"><Icon name="link" size={15} /> {t('Kết nối sàn')}</LinkButton>
                </div>
              }
            />
          )
        ) : (
          <DataTable
            plain
            caption="Đơn E-commerce"
            columns={columns}
            rows={rows}
            rowKey={o => o.id}
            loading={isFetching}
            highlight={o => selected.has(o.id)}
            onRowClick={o => setOpenedId(o.id)}
            minWidth={860}
            empty={{
              title: 'Không có đơn phù hợp',
              action: filtering ? <Button size="sm" onClick={() => { setView('all'); setSrc('all'); setSearch(''); setQ(''); }}>{t('Xóa bộ lọc')}</Button> : undefined
            }}
          />
        )}
      </Card>

      <EcomOrderDrawer order={opened} onClose={() => setOpenedId(null)} onDelete={o => setDeleting([o])} />
      <DeleteOrdersModal
        orders={deleting}
        onClose={() => setDeleting([])}
        onDeleted={() => {
          clearSelection();
          if (deleting.some(o => o.id === openedId)) setOpenedId(null);
        }}
      />
    </div>
  );
}

/** Shop đã kết nối: lần đồng bộ gần nhất + nút đồng bộ ngay; kết nối hết hạn thì dẫn sang tab Kết nối để ủy quyền lại. */
function StoreSyncBar({ stores }: { stores: ReadonlyArray<StoreConnection> }) {
  const { t } = useI18n();
  const sync = useSyncStore();
  return (
    <Card>
      <div className={styles.syncBar}>
        {stores.map(s => (
          <div key={s.id} className={styles.syncStore}>
            <Icon name="link" size={15} />
            <div className={styles.syncText}>
              <strong>{s.shopName}</strong>
              <span className={styles.sub}>
                {STORE_PLATFORMS[s.platform].label}
                {' · '}
                {s.lastSyncAt ? t('đồng bộ {date}', { date: formatSyncTime(s.lastSyncAt) }) : t('chưa đồng bộ')}
              </span>
            </div>
            {needsReauthorize(s) ? (
              <LinkButton to="?tab=connect" size="sm" variant="primary">{t('Ủy quyền lại')}</LinkButton>
            ) : (
              <Button size="sm" disabled={sync.isPending} onClick={() => sync.mutate(s.id)}>
                <Icon name="refresh" size={15} /> {t(sync.isPending && sync.variables === s.id ? 'Đang đồng bộ…' : 'Đồng bộ')}
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
