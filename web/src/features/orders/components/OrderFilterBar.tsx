import { useEffect, useState, type ChangeEvent } from 'react';
import { useI18n } from '@/shared/i18n';
import { useDebouncedCallback } from '@/shared/lib/useDebouncedCallback';
import { Button, SelectField, TextField } from '@/shared/ui';
import { parseTags, serializeTags } from '../lib/multi-filter';
import type { OrderFilters } from '../types';
import { TagSearch } from './TagSearch';
import styles from './OrderFilterBar.module.css';

interface OrderFilterBarProps {
  filters: OrderFilters;
  onChange: (patch: Partial<OrderFilters>) => void;
  onReset: () => void;
}

type TextKey = 'weightFrom' | 'weightTo';

export function OrderFilterBar({ filters, onChange, onReset }: OrderFilterBarProps) {
  const { t } = useI18n();
  // Ô gõ tự do giữ state cục bộ để nhập mượt, đẩy lên URL sau khi ngừng gõ.
  const [draft, setDraft] = useState<Record<TextKey, string>>({ weightFrom: filters.weightFrom, weightTo: filters.weightTo });
  useEffect(() => setDraft({ weightFrom: filters.weightFrom, weightTo: filters.weightTo }), [filters.weightFrom, filters.weightTo]);
  const pushText = useDebouncedCallback((patch: Partial<OrderFilters>) => onChange(patch));

  const onText = (key: TextKey) => (e: ChangeEvent<HTMLInputElement>) => {
    setDraft(d => ({ ...d, [key]: e.target.value }));
    pushText({ [key]: e.target.value });
  };

  // Thẻ tìm lưu trên URL (?q=cnee:Uyen%0Act:Singapore); link cũ không có tiền tố dùng trường đang chọn.
  const tags = parseTags(filters.q, filters.searchField);

  return (
    <section className={styles.bar} aria-label={t('Bộ lọc đơn hàng')}>
      <div className={styles.row}>
        <TextField label="Từ ngày" type="date" max={filters.toDate || undefined} value={filters.fromDate} onChange={e => onChange({ fromDate: e.target.value })} />
        <TextField label="Đến ngày" type="date" min={filters.fromDate || undefined} value={filters.toDate} onChange={e => onChange({ toDate: e.target.value })} />
        <SelectField
          label="Loại hàng"
          value={filters.type}
          onChange={e => onChange({ type: e.target.value as OrderFilters['type'] })}
          placeholder="Tất cả"
          options={['DOC', 'PACK']}
        />
        <TextField label="Cân từ" type="number" min={0} step={0.1} suffix="kg" value={draft.weightFrom} onChange={onText('weightFrom')} />
        <TextField label="Cân đến" type="number" min={0} step={0.1} suffix="kg" value={draft.weightTo} onChange={onText('weightTo')} />
      </div>
      <div className={styles.searchRow}>
        <div className={styles.search}>
          <label className={styles.searchLabel} htmlFor="order-search">{t('Tìm theo')}</label>
          <TagSearch
            tags={tags}
            onTagsChange={next => onChange({ q: serializeTags(next) })}
            field={filters.searchField}
            onFieldChange={searchField => onChange({ searchField, page: filters.page })}
          />
        </div>
        <Button onClick={onReset}>{t('Xóa lọc')}</Button>
      </div>
    </section>
  );
}
