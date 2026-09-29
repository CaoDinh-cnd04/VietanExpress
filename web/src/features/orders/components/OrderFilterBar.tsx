import { useEffect, useState, type ChangeEvent } from 'react';
import { BRANCHES } from '@/shared/config/domain';
import { useDebouncedCallback } from '@/shared/lib/useDebouncedCallback';
import { Button, SelectField, TextField } from '@/shared/ui';
import { SEARCH_FIELDS } from '../constants';
import type { OrderFilters, OrderSearchField } from '../types';
import styles from './OrderFilterBar.module.css';

interface OrderFilterBarProps {
  filters: OrderFilters;
  onChange: (patch: Partial<OrderFilters>) => void;
  onReset: () => void;
}

type TextKey = 'q' | 'weightFrom' | 'weightTo';

export function OrderFilterBar({ filters, onChange, onReset }: OrderFilterBarProps) {
  // Ô gõ tự do giữ state cục bộ để nhập mượt, đẩy lên URL sau khi ngừng gõ.
  const [draft, setDraft] = useState<Record<TextKey, string>>({ q: filters.q, weightFrom: filters.weightFrom, weightTo: filters.weightTo });
  useEffect(() => setDraft({ q: filters.q, weightFrom: filters.weightFrom, weightTo: filters.weightTo }), [filters.q, filters.weightFrom, filters.weightTo]);
  const pushText = useDebouncedCallback((patch: Partial<OrderFilters>) => onChange(patch));

  const onText = (key: TextKey) => (e: ChangeEvent<HTMLInputElement>) => {
    setDraft(d => ({ ...d, [key]: e.target.value }));
    pushText({ [key]: e.target.value });
  };

  return (
    <section className={styles.bar} aria-label="Bộ lọc đơn hàng">
      <div className={styles.row}>
        <TextField label="Từ ngày" type="date" value={filters.fromDate} onChange={e => onChange({ fromDate: e.target.value })} />
        <TextField label="Đến ngày" type="date" value={filters.toDate} onChange={e => onChange({ toDate: e.target.value })} />
        <SelectField
          label="Loại hàng"
          value={filters.type}
          onChange={e => onChange({ type: e.target.value as OrderFilters['type'] })}
          placeholder="Tất cả"
          options={['DOC', 'PACK']}
        />
        <TextField label="Cân từ" type="number" min={0} step={0.1} suffix="kg" value={draft.weightFrom} onChange={onText('weightFrom')} />
        <TextField label="Cân đến" type="number" min={0} step={0.1} suffix="kg" value={draft.weightTo} onChange={onText('weightTo')} />
        <SelectField
          label="Chi nhánh gửi"
          value={filters.branch}
          onChange={e => onChange({ branch: e.target.value })}
          options={[{ value: 'all', label: 'Tất cả chi nhánh' }, ...BRANCHES.map(b => ({ value: b, label: b }))]}
        />
      </div>
      <div className={styles.searchRow}>
        <div className={styles.search}>
          <label className={styles.searchLabel} htmlFor="order-search">Tìm theo</label>
          <div className={styles.searchGroup}>
            <select
              aria-label="Trường tìm kiếm"
              className={styles.searchField}
              value={filters.searchField}
              onChange={e => onChange({ searchField: e.target.value as OrderSearchField })}
            >
              {SEARCH_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <input id="order-search" className={styles.searchInput} placeholder="Nhập từ khóa…" value={draft.q} onChange={onText('q')} />
          </div>
        </div>
        <Button onClick={onReset}>Xóa lọc</Button>
      </div>
    </section>
  );
}
