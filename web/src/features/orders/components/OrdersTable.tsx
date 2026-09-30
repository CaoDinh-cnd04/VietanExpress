import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { StatusPill } from '@/shared/ui';
import { ORDER_STATUS } from '../constants';
import { datePart, estimatePodDate } from '../lib/order-utils';
import type { Order, OrderActions, OrderSortField, SortDir } from '../types';
import { OrderRowActions } from './OrderRowActions';
import { TrackingLinks } from './TrackingLinks';
import styles from './OrdersTable.module.css';

interface OrdersTableProps {
  orders: Order[];
  /** Số thứ tự bắt đầu của trang hiện tại. */
  offset: number;
  sortBy: OrderSortField;
  sortDir: SortDir;
  onSort: (field: OrderSortField) => void;
  selected: ReadonlySet<string>;
  onToggle: (bill: string) => void;
  onToggleAll: (checked: boolean) => void;
  actions: OrderActions;
  loading?: boolean;
}

const COLUMNS: ReadonlyArray<{ label: string; sort?: OrderSortField; className?: string }> = [
  { label: 'Ref No.', sort: 'ref' },
  { label: 'VA Bill', sort: 'bill' },
  { label: 'Người nhận', sort: 'cnee', className: styles.colCnee },
  { label: 'Nước đến / dịch vụ', sort: 'ct' },
  { label: 'Ngày gửi', sort: 'sent' },
  { label: 'POD / dự kiến', sort: 'pod' },
  { label: 'Tracking' },
  { label: 'Ngày tạo', sort: 'created', className: styles.colCreated },
  { label: 'In bill', className: styles.colActions }
];

export function OrdersTable(props: OrdersTableProps) {
  const { orders, offset, sortBy, sortDir, onSort, selected, onToggle, onToggleAll, actions, loading } = props;
  const allChecked = orders.length > 0 && orders.every(o => selected.has(o.bill));
  const { t } = useI18n();

  return (
    <div className={styles.scroll}>
      <table className={cx(styles.table, loading && styles.loading)}>
        <thead>
          <tr>
            <th className={styles.colCheck}>
              <input type="checkbox" aria-label={t('Chọn tất cả đơn trên trang')} checked={allChecked} onChange={e => onToggleAll(e.target.checked)} />
            </th>
            <th className={styles.colNo}>#</th>
            {COLUMNS.map(col => (
              <th key={col.label} className={col.className} aria-sort={col.sort && col.sort === sortBy ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                {col.sort ? (
                  <button type="button" className={styles.sortBtn} onClick={() => onSort(col.sort!)}>
                    {t(col.label)}
                    <span className={styles.sortMark}>{col.sort === sortBy ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
                  </button>
                ) : (
                  t(col.label)
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => (
            <OrderRow key={o.bill} order={o} index={offset + i + 1} checked={selected.has(o.bill)} onToggle={onToggle} actions={actions} />
          ))}
          {!orders.length && (
            <tr>
              <td colSpan={COLUMNS.length + 2} className={styles.empty}>{t(loading ? 'Đang tải…' : 'Không có đơn nào khớp bộ lọc.')}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface OrderRowProps {
  order: Order;
  index: number;
  checked: boolean;
  onToggle: (bill: string) => void;
  actions: OrderActions;
}

function Nil({ children = '—' }: { children?: string }) {
  const { t } = useI18n();
  return <span className={styles.nil}>{t(children)}</span>;
}

function OrderRow({ order: o, index, checked, onToggle, actions }: OrderRowProps) {
  const { t } = useI18n();
  const status = ORDER_STATUS[o.st];
  const estimate = estimatePodDate(o);

  return (
    <tr
      className={styles.row}
      onClick={e => {
        if (!(e.target as HTMLElement).closest('button, input, a')) actions.onOpen(o);
      }}
    >
      <td className={styles.colCheck}>
        <input type="checkbox" aria-label={t('Chọn đơn {bill}', { bill: o.bill })} checked={checked} onChange={() => onToggle(o.bill)} />
      </td>
      <td className={styles.colNo}>{index}</td>
      <td>{o.ref ? <span className="mono">{o.ref}</span> : <Nil />}</td>
      <td>
        <div className={cx('mono', styles.bill)}>{o.bill}</div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </td>
      <td className={styles.colCnee}><span className={styles.cnee}>{o.cnee}</span></td>
      <td>
        <div>{o.ct}</div>
        <div className={styles.route}>{t(o.route)}</div>
      </td>
      <td>
        {o.sent ? <div className="tabular">{o.sent}</div> : <Nil>{'Chưa gửi'}</Nil>}
        {o.connect && <div className={cx('mono', styles.sub)} title={t('Mã tracking hãng / last-mile')}>{o.connect}</div>}
      </td>
      <td>
        {o.pod ? (
          <>
            <div className="tabular">{o.pod.date} {o.pod.time}</div>
            <div className={styles.sub}>{t('Ký: {name}', { name: o.pod.signer })}</div>
          </>
        ) : estimate ? (
          <>
            <div className={styles.sub}>{t('Dự kiến')}</div>
            <div className="tabular">{estimate}</div>
          </>
        ) : (
          <Nil />
        )}
      </td>
      <td><TrackingLinks bill={o.bill} /></td>
      <td className={styles.colCreated}>
        <div className="tabular">{datePart(o.created)}</div>
        <div className={styles.sub}>{t(o.pcs)}</div>
        <div className={styles.content}>{o.content}</div>
      </td>
      <td className={styles.colActions}><OrderRowActions order={o} actions={actions} /></td>
    </tr>
  );
}
