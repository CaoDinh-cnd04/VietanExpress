import { useState } from 'react';
import { useDebouncedCallback } from '@/shared/lib/useDebouncedCallback';
import { downloadTextFile, toCsv } from '@/shared/lib/files';
import { Button, Card, DataTable, Icon, SelectField, StatusPill, Tabs, type Column } from '@/shared/ui';
import { useEcomOrders, usePrintEcomLabels } from '../api';
import { ECOM_SOURCES, ECOM_STATUS, LABEL_FORMATS } from '../constants';
import type { EcomOrder, EcomSource } from '../types';
import styles from './ecommerce.module.css';

/** Tab "Đơn e-com": lọc theo nguồn, tìm kiếm, chọn nhiều để in nhãn / xuất Excel. */
export function EcomOrderList() {
  const [src, setSrc] = useState<EcomSource | 'all'>('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [format, setFormat] = useState<string>(LABEL_FORMATS[0]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebouncedCallback(setQ, 300);
  const all = useEcomOrders();
  const { data: rows = [], isFetching } = useEcomOrders(src, q);
  const print = usePrintEcomLabels();

  const counts = (all.data ?? []).reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.src]: (acc[o.src] ?? 0) + 1 }), {});
  const tabs = [
    { key: 'all' as const, label: 'Tất cả', count: all.data?.length ?? 0 },
    ...(Object.keys(ECOM_SOURCES) as EcomSource[]).filter(s => counts[s]).map(s => ({ key: s, label: ECOM_SOURCES[s].label, count: counts[s] }))
  ];

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const allChecked = rows.length > 0 && rows.every(r => selected.has(r.id));

  const exportCsv = () =>
    downloadTextFile(
      'don-ecom.csv',
      toCsv([
        ['Nguồn', 'Mã đơn shop', 'VA Bill', 'Người nhận', 'Nước đến', 'Số SP', 'Cân (kg)', 'Trạng thái', 'Ghi chú', 'Ngày tạo'],
        ...rows.map(o => [ECOM_SOURCES[o.src]?.label ?? o.src, o.ref, o.bill, o.cnee, o.ct, o.items, o.kg, ECOM_STATUS[o.st]?.label ?? o.st, o.note ?? '', o.createdAt])
      ])
    );

  const columns: ReadonlyArray<Column<EcomOrder>> = [
    {
      key: 'chk',
      width: 36,
      header: <input type="checkbox" aria-label="Chọn tất cả" checked={allChecked} onChange={e => setSelected(e.target.checked ? new Set(rows.map(r => r.id)) : new Set())} />,
      render: o => <input type="checkbox" aria-label={`Chọn đơn ${o.ref}`} checked={selected.has(o.id)} onChange={() => toggle(o.id)} />
    },
    { key: 'src', header: 'Nguồn', render: o => <span className={styles.sourceTag}>{ECOM_SOURCES[o.src]?.label ?? o.src}</span> },
    { key: 'ref', header: 'Mã đơn shop', render: o => <span className="mono">{o.ref}</span> },
    { key: 'bill', header: 'VA Bill', render: o => (o.bill ? <span className="mono">{o.bill}</span> : <span className={styles.muted}>—</span>) },
    { key: 'cnee', header: 'Người nhận', render: o => <><div className={styles.strong}>{o.cnee}</div><div className={styles.sub}>{o.ct}</div></> },
    { key: 'items', header: 'SP', align: 'right', render: o => o.items },
    { key: 'kg', header: 'Cân', align: 'right', render: o => (o.kg ? `${o.kg} kg` : <span className={styles.warnText}>chờ cân</span>) },
    { key: 'st', header: 'Trạng thái', render: o => <StatusPill tone={ECOM_STATUS[o.st]?.tone}>{ECOM_STATUS[o.st]?.label ?? o.st}</StatusPill> },
    { key: 'note', header: 'Ghi chú', render: o => o.note || <span className={styles.muted}>—</span> },
    { key: 'date', header: 'Ngày tạo', render: o => <span className="tabular">{o.createdAt}</span> }
  ];

  return (
    <Card flush>
      <Tabs ariaLabel="Lọc theo nguồn" items={tabs} value={src} onChange={k => { setSrc(k); setSelected(new Set()); }} />
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Icon name="search" size={16} />
          <input
            aria-label="Tìm đơn e-com"
            placeholder="Tìm theo mã đơn shop, VA Bill, người nhận…"
            value={search}
            onChange={e => { setSearch(e.target.value); debouncedSearch(e.target.value); }}
          />
        </div>
        <SelectField label="Khổ nhãn" options={LABEL_FORMATS} value={format} onChange={e => setFormat(e.target.value)} className={styles.formatField} />
        <Button disabled={!selected.size || print.isPending} onClick={() => print.mutate({ ids: [...selected], format })}>
          <Icon name="printer" size={16} /> In nhãn ({selected.size})
        </Button>
        <Button onClick={exportCsv} disabled={!rows.length}><Icon name="download" size={16} /> Xuất Excel</Button>
      </div>
      <DataTable
        caption="Đơn e-commerce"
        columns={columns}
        rows={rows}
        rowKey={o => o.id}
        loading={isFetching}
        minWidth={1040}
        empty={{ title: 'Không có đơn phù hợp' }}
      />
    </Card>
  );
}
