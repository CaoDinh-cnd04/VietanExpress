import { useMemo, useState } from 'react';
import { get, useFieldArray, useFormContext } from 'react-hook-form';
import { Button, Icon, Modal } from '@/shared/ui';
import { useCategories } from '../api';
import { MULTI_CATEGORY } from '../constants';
import type { CreateOrderValues } from '../schema';
import styles from './form.module.css';

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

/** In riêng bảng phân loại để đính kèm bộ bill vật lý. */
function printTable(rows: ReadonlyArray<{ category: string; note: string }>, receiver: string) {
  const w = window.open('', '_blank', 'width=720,height=640');
  if (!w) return;
  w.document.write(`<!doctype html><title>Bảng phân loại nhóm hàng</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:8px;text-align:left}</style>
    <h2>Bảng phân loại nhóm hàng</h2><p>Người nhận: ${escapeHtml(receiver || '—')}</p>
    <table><thead><tr><th>#</th><th>Nhóm hàng hóa</th><th>Ghi chú</th></tr></thead><tbody>
    ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(r.category)}</td><td>${escapeHtml(r.note)}</td></tr>`).join('')}
    </tbody></table>`);
  w.document.close();
  w.focus();
  w.print();
}

/** Bảng các nhóm hàng trong kiện (khi chọn "Nhiều loại hàng"). */
export function MultiCategoryTable() {
  const { control, register, getValues, formState } = useFormContext<CreateOrderValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'goods.multi' });
  const { data: categories = [] } = useCategories();
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const error = get(formState.errors, 'goods.multi')?.message as string | undefined;

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.map(c => c.name).filter(n => n !== MULTI_CATEGORY && (!q || n.toLowerCase().includes(q)));
  }, [categories, query]);

  const openPicker = () => {
    setChecked(new Set(fields.map(f => f.category)));
    setQuery('');
    setPicking(true);
  };

  const apply = () => {
    const current = getValues('goods.multi');
    // Bỏ nhóm đã bỏ tick (giữ ghi chú của nhóm còn lại), thêm nhóm mới
    [...current.keys()].reverse().forEach(i => !checked.has(current[i]!.category) && remove(i));
    const existing = new Set(current.map(r => r.category));
    append([...checked].filter(c => !existing.has(c)).map(category => ({ category, note: '' })));
    setPicking(false);
  };

  return (
    <div className={styles.spaced}>
      <div className={styles.inlineActions}>
        <strong>Bảng phân loại nhóm hàng ({fields.length})</strong>
        <Button size="sm" onClick={openPicker}><Icon name="plus" size={15} /> Thêm / sửa nhóm</Button>
        <Button size="sm" variant="ghost" disabled={!fields.length} onClick={() => printTable(getValues('goods.multi'), getValues('receiver.company'))}>
          <Icon name="printer" size={15} /> In bảng (đính kèm bill)
        </Button>
      </div>
      {error && <p className={styles.errorText} role="alert">{error}</p>}
      {fields.length > 0 && (
        <div className={`${styles.tableScroll} ${styles.spaced}`}>
          <table className={styles.table}>
            <thead>
              <tr><th className={styles.colNo}>#</th><th>Nhóm hàng hóa</th><th>Ghi chú</th><th className={styles.colDel}><span className="visually-hidden">Xóa</span></th></tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={f.id}>
                  <td className={styles.rowNo}>{i + 1}</td>
                  <td className={styles.cellText}>{f.category}</td>
                  <td><input className={styles.cell} aria-label={`Ghi chú nhóm ${f.category}`} placeholder="VD: 3 hộp, hàng dễ vỡ…" {...register(`goods.multi.${i}.note`)} /></td>
                  <td><Button size="sm" iconOnly variant="ghost" aria-label={`Bỏ nhóm ${f.category}`} onClick={() => remove(i)}><Icon name="close" size={15} /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className={styles.hint}>Bảng này được in riêng để đính kèm bộ bill vật lý khi kiện gồm nhiều nhóm hàng.</p>

      <Modal
        open={picking}
        title="Chọn các nhóm hàng trong kiện"
        onClose={() => setPicking(false)}
        footerNote={`Đã chọn ${checked.size} nhóm`}
        footer={<Button variant="primary" onClick={apply}>Xác nhận</Button>}
      >
        <input className={styles.pickerSearch} placeholder="Tìm nhóm…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Tìm nhóm hàng" />
        <div className={styles.checkList}>
          {options.map(name => (
            <label key={name} className={styles.checkItem}>
              <input
                type="checkbox"
                checked={checked.has(name)}
                onChange={() => setChecked(prev => {
                  const next = new Set(prev);
                  if (next.has(name)) next.delete(name);
                  else next.add(name);
                  return next;
                })}
              />
              <span><strong>{name}</strong></span>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
