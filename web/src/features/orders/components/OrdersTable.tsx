import { useCallback } from 'react';
import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { useCellSelection } from '@/shared/lib/useCellSelection';
import { Button, Icon, StatusPill, useToast } from '@/shared/ui';
import { ORDER_STATUS } from '../constants';
import { vaTrackingLink } from '@/shared/config/domain';
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

/** Giá trị chép ra khi bôi chọn ô — theo đúng thứ tự COLUMNS (cột "In bill" không chọn được). */
type CopyValue = (o: Order, t: (s: string) => string) => string;
const COPY_VALUES: ReadonlyArray<CopyValue> = [
  o => [o.bill, o.ref].filter(Boolean).join(' / '),
  o => [o.cnee, o.ct].filter(Boolean).join(' / '),
  (o, t) => t(o.route),
  (o, t) => [o.content, t(o.pcs)].filter(Boolean).join(' · '),
  o => [datePart(o.created), o.sent, o.pod ? `${o.pod.date} ${o.pod.time}` : estimatePodDate(o)].filter(Boolean).join(' → '),
  o => vaTrackingLink(o.bill)
];

/**
 * Bảng dễ đọc cho khách: mỗi cột 1 nhóm thông tin (mã đơn · người nhận · dịch vụ · hàng · hành trình · tracking),
 * dòng chính đậm, dòng phụ nhạt; hành trình ghi nhãn Tạo / Gửi / Giao rõ ràng.
 */
const COLUMNS: ReadonlyArray<{ label: string; sort?: OrderSortField; className?: string }> = [
  { label: 'VA Bill / Ref', sort: 'bill', className: styles.colBill },
  { label: 'Người nhận / nước đến', sort: 'cnee', className: styles.colCnee },
  { label: 'Dịch vụ', className: styles.colService },
  { label: 'Hàng hóa', className: styles.colGoods },
  { label: 'Hành trình', sort: 'sent', className: styles.colJourney },
  { label: 'Tracking' },
  { label: 'In bill', className: styles.colActions }
];

export function OrdersTable(props: OrdersTableProps) {
  const { orders, offset, sortBy, sortDir, onSort, selected, onToggle, onToggleAll, actions, loading } = props;
  const allChecked = orders.length > 0 && orders.every(o => selected.has(o.bill));
  const { t } = useI18n();
  const toast = useToast();
  const value = useCallback((row: number, col: number) => (orders[row] ? (COPY_VALUES[col]?.(orders[row], t) ?? '') : ''), [orders, t]);
  const cells = useCellSelection(value, n => toast.show(t('Đã sao chép {n} ô — dán được vào Excel', { n }), 'success'));

  return (
    <div className={styles.scroll}>
      {cells.count > 0 ? (
        <div className={styles.cellBar} data-cell-toolbar>
          <span>{t('Đã chọn {n} ô', { n: cells.count })}</span>
          <Button size="sm" variant="primary" onClick={() => void cells.copy()}>
            <Icon name="copy" size={14} /> {t('Sao chép')} <kbd className={styles.kbd}>Ctrl+C</kbd>
          </Button>
          <Button size="sm" variant="ghost" onClick={cells.clear}>{t('Bỏ chọn')}</Button>
        </div>
      ) : (
        <p className={styles.cellHint}>{t('Mẹo: nhấn giữ chuột và kéo dọc theo cột để chọn nhiều ô, rồi Ctrl+C để chép sang Excel.')}</p>
      )}
      <table ref={cells.tableRef} className={cx(styles.table, loading && styles.loading, cells.selecting && styles.selecting)}>
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
            <OrderRow
              key={o.bill}
              order={o}
              index={offset + i + 1}
              checked={selected.has(o.bill)}
              onToggle={onToggle}
              actions={actions}
              cell={col => cells.cellProps(i, col)}
              consumeClick={cells.consumeClick}
            />
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
  /** Thuộc tính chọn ô cho cột dữ liệu thứ `col` (0 = Ref No.). */
  cell: (col: number) => ReturnType<ReturnType<typeof useCellSelection>['cellProps']>;
  consumeClick: () => boolean;
}

function Nil({ children = '—' }: { children?: string }) {
  const { t } = useI18n();
  return <span className={styles.nil}>{t(children)}</span>;
}

function OrderRow({ order: o, index, checked, onToggle, actions, cell, consumeClick }: OrderRowProps) {
  const { t } = useI18n();
  const status = ORDER_STATUS[o.st];
  const estimate = estimatePodDate(o);

  return (
    <tr
      className={styles.row}
      onClick={e => {
        if (consumeClick()) return; // vừa kéo chọn ô
        if (window.getSelection()?.toString()) return; // đang bôi chữ trong ô
        if (!(e.target as HTMLElement).closest('button, input, a')) actions.onOpen(o);
      }}
    >
      <td className={styles.colCheck}>
        <input type="checkbox" aria-label={t('Chọn đơn {bill}', { bill: o.bill })} checked={checked} onChange={() => onToggle(o.bill)} />
      </td>
      <td className={styles.colNo}>{index}</td>
      <td className={styles.colBill} {...cell(0)}>
        <div className={cx('mono', styles.bill)}>{o.bill}</div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
        {o.ref && <div className={styles.sub}>{t('Ref')}: <span className="mono">{o.ref}</span></div>}
      </td>
      <td className={styles.colCnee} {...cell(1)}>
        <div className={styles.primary}>{o.cnee}</div>
        <div className={styles.sub}><Icon name="globe" size={12} /> {o.ct || '—'}</div>
      </td>
      <td className={styles.colService} {...cell(2)}><span className={styles.route}>{t(o.route)}</span></td>
      <td className={styles.colGoods} {...cell(3)}>
        <div className={styles.goods}>{o.content || <Nil />}</div>
        <div className={styles.sub}>{t(o.pcs)}</div>
      </td>
      <td className={styles.colJourney} {...cell(4)}>
        <dl className={styles.journey}>
          <dt>{t('Tạo')}</dt>
          <dd className="tabular">{datePart(o.created)}</dd>
          <dt>{t('Gửi')}</dt>
          <dd className="tabular">{o.sent || <Nil>{'Chưa gửi'}</Nil>}</dd>
          {o.connect && (
            <>
              <dt>{t('Mã hãng')}</dt>
              <dd className="mono" title={t('Mã tracking hãng / last-mile')}>{o.connect}</dd>
            </>
          )}
          <dt>{t(o.pod || !estimate ? 'Giao' : 'Dự kiến')}</dt>
          <dd className={cx('tabular', o.pod && styles.delivered)}>
            {o.pod ? (
              <>
                {o.pod.date} {o.pod.time}
                {o.pod.signer && <span className={styles.signer}> · {t('Ký: {name}', { name: o.pod.signer })}</span>}
              </>
            ) : (
              estimate || <Nil />
            )}
          </dd>
        </dl>
      </td>
      <td {...cell(5)}><TrackingLinks bill={o.bill} /></td>
      <td className={styles.colActions}><OrderRowActions order={o} actions={actions} /></td>
    </tr>
  );
}
