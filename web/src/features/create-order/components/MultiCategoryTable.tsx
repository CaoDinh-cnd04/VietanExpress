import { useMemo, useState } from 'react';
import { get, useFieldArray, useFormContext } from 'react-hook-form';
import { useI18n } from '@/shared/i18n';
import { Button, Icon, Modal } from '@/shared/ui';
import { useCategories } from '../api';
import { MULTI_CATEGORY } from '../constants';
import type { CreateOrderValues } from '../schema';
import { CategoryManagerDialog } from './CategoryManagerDialog';
import styles from './form.module.css';

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

/** In riêng bảng phân loại để đính kèm bộ bill vật lý. */
function printTable(rows: ReadonlyArray<{ category: string; note: string }>, receiver: string, t: (text: string) => string) {
  const w = window.open('', '_blank', 'width=720,height=640');
  if (!w) return;
  const title = escapeHtml(t('Bảng phân loại nhóm hàng'));
  w.document.write(`<!doctype html><title>${title}</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:8px;text-align:left}</style>
    <h2>${title}</h2><p>${escapeHtml(t('Người nhận'))}: ${escapeHtml(receiver || '—')}</p>
    <table><thead><tr><th>#</th><th>${escapeHtml(t('Nhóm hàng hóa'))}</th><th>${escapeHtml(t('Ghi chú'))}</th></tr></thead><tbody>
    ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(r.category)}</td><td>${escapeHtml(r.note)}</td></tr>`).join('')}
    </tbody></table>`);
  w.document.close();
  w.focus();
  w.print();
}

/** Bảng các nhóm hàng trong kiện (khi chọn "Nhiều loại hàng"). */
export function MultiCategoryTable() {
  const { t } = useI18n();
  const { control, register, getValues, formState } = useFormContext<CreateOrderValues>();
  const { fields, append, remove, update } = useFieldArray({ control, name: 'goods.multi' });
  const { data: categories = [] } = useCategories();
  const [picking, setPicking] = useState(false);
  // Thêm / sửa nhóm: tạm đóng hộp chọn, mở hộp quản lý; đóng hộp quản lý thì quay lại hộp chọn (giữ các nhóm đã tick).
  const [managing, setManaging] = useState(false);
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
        <strong>{t('Bảng phân loại nhóm hàng ({n})', { n: fields.length })}</strong>
        <Button size="sm" onClick={openPicker}><Icon name="plus" size={15} /> {t('Thêm / sửa nhóm')}</Button>
        <Button size="sm" variant="ghost" disabled={!fields.length} onClick={() => printTable(getValues('goods.multi'), getValues('receiver.company'), t)}>
          <Icon name="printer" size={15} /> {t('In bảng (đính kèm bill)')}
        </Button>
      </div>
      {error && <p className={styles.errorText} role="alert">{error}</p>}
      {fields.length > 0 && (
        <div className={`${styles.tableScroll} ${styles.spaced}`}>
          <table className={styles.table}>
            <thead>
              <tr><th className={styles.colNo}>#</th><th>{t('Nhóm hàng hóa')}</th><th>{t('Ghi chú')}</th><th className={styles.colDel}><span className="visually-hidden">{t('Xóa')}</span></th></tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={f.id}>
                  <td className={styles.rowNo}>{i + 1}</td>
                  <td className={styles.cellText}>{t(f.category)}</td>
                  <td><input className={styles.cell} aria-label={t('Ghi chú nhóm {name}', { name: f.category })} placeholder={t('VD: 3 hộp, hàng dễ vỡ…')} {...register(`goods.multi.${i}.note`)} /></td>
                  <td><Button size="sm" iconOnly variant="ghost" aria-label={t('Bỏ nhóm {name}', { name: f.category })} onClick={() => remove(i)}><Icon name="close" size={15} /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className={styles.hint}>{t('Bảng này được in riêng để đính kèm bộ bill vật lý khi kiện gồm nhiều nhóm hàng.')}</p>

      <Modal
        open={picking}
        title="Chọn các nhóm hàng trong kiện"
        onClose={() => setPicking(false)}
        footerNote={t('Đã chọn {n} nhóm', { n: checked.size })}
        footer={
          <>
            <Button onClick={() => { setPicking(false); setManaging(true); }}><Icon name="edit" size={15} /> {t('Thêm / sửa nhóm hàng')}</Button>
            <Button variant="primary" onClick={apply}>{t('Xác nhận')}</Button>
          </>
        }
      >
        <input className={styles.pickerSearch} placeholder={t('Tìm nhóm…')} value={query} onChange={e => setQuery(e.target.value)} aria-label={t('Tìm nhóm hàng')} />
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
              <span><strong>{t(name)}</strong></span>
            </label>
          ))}
        </div>
      </Modal>

      <CategoryManagerDialog
        open={managing}
        onClose={() => { setManaging(false); setPicking(true); }}
        onCreated={name => setChecked(prev => new Set(prev).add(name))}
        onRenamed={(from, to) => {
          setChecked(prev => (prev.has(from) ? new Set([...prev].map(n => (n === from ? to : n))) : prev));
          getValues('goods.multi').forEach((r, i) => r.category === from && update(i, { ...r, category: to }));
        }}
      />
    </div>
  );
}
