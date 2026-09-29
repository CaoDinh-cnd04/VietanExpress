import { useRef, useState } from 'react';
import { isNotImplemented } from '@/shared/api/http';
import { downloadTextFile, readFileAsText, toCsv } from '@/shared/lib/files';
import { Button, Icon, Modal, Notice, useToast } from '@/shared/ui';
import { useProductLibrary, useRecentInvoices, type SavedProduct } from '../api';
import { invoiceTemplate, parseInvoiceCsv } from '../lib/invoice-import';
import { emptyInvoiceItem, type InvoiceItemValues } from '../schema';
import styles from './form.module.css';

interface InvoiceToolbarProps {
  /** Thêm dòng vào invoice; replace = thay toàn bộ (dùng khi chép invoice cũ). */
  onItems: (items: InvoiceItemValues[], mode: 'append' | 'replace') => void;
}

const toItem = (p: SavedProduct): InvoiceItemValues => ({ ...emptyInvoiceItem(), ...p, qty: '1' });

/** Công cụ khai invoice nhanh: thư viện mặt hàng, invoice cũ, import CSV, file mẫu. */
export function InvoiceToolbar({ onItems }: InvoiceToolbarProps) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dialog, setDialog] = useState<'library' | 'recent' | null>(null);
  const library = useProductLibrary(dialog === 'library');
  const recent = useRecentInvoices(dialog === 'recent');

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) return toast.show('Chỉ nhận file .csv — với Excel hãy lưu dạng CSV UTF-8', 'error');
    const { items, skipped } = parseInvoiceCsv(await readFileAsText(file));
    if (items.length) onItems(items, 'append');
    toast.show(
      `Đã thêm ${items.length} mặt hàng${skipped.length ? `, bỏ qua ${skipped.length} dòng lỗi (${skipped.slice(0, 2).join('; ')}${skipped.length > 2 ? '…' : ''})` : ''}`,
      items.length ? 'success' : 'error'
    );
  };

  const unavailable = (e: unknown) =>
    isNotImplemented(e) ? <Notice tone="warning">Chức năng đang được kết nối máy chủ.</Notice> : <Notice tone="danger">Không tải được dữ liệu.</Notice>;

  return (
    <div className={styles.toolbar}>
      <Button size="sm" onClick={() => setDialog('library')}><Icon name="bag" size={15} /> Thư viện mặt hàng</Button>
      <Button size="sm" onClick={() => setDialog('recent')}><Icon name="clock" size={15} /> Invoice cũ</Button>
      <Button size="sm" onClick={() => fileRef.current?.click()}><Icon name="upload" size={15} /> Import Excel</Button>
      <Button size="sm" variant="ghost" onClick={() => downloadTextFile('VietAn_Mau_Invoice.csv', toCsv(invoiceTemplate()))}><Icon name="download" size={15} /> File mẫu</Button>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="visually-hidden" tabIndex={-1} onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />

      <Modal open={dialog === 'library'} title="Thư viện mặt hàng" size="lg" onClose={() => setDialog(null)}>
        {library.isError ? unavailable(library.error) : library.isLoading ? <p className={styles.pickerEmpty}>Đang tải…</p> : !library.data?.length ? (
          <p className={styles.pickerEmpty}>Chưa có mặt hàng đã lưu.</p>
        ) : (
          <ul className={styles.pickerList}>
            {library.data.map(p => (
              <li key={p.id ?? p.descEn}>
                <button type="button" className={styles.pickerItem} onClick={() => { onItems([toItem(p)], 'append'); setDialog(null); }}>
                  <span className={styles.pickerText}>
                    <strong>{p.descEn}{p.descVi ? ` / ${p.descVi}` : ''}</strong>
                    <span>HS {p.hs || '—'} · {p.origin} · {p.unit}{p.price ? ` · ${p.price}` : ''}</span>
                  </span>
                  <span className={styles.pickerGo}>Thêm</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal open={dialog === 'recent'} title="Chép invoice từ đơn cũ" size="lg" onClose={() => setDialog(null)}>
        {recent.isError ? unavailable(recent.error) : recent.isLoading ? <p className={styles.pickerEmpty}>Đang tải…</p> : !recent.data?.length ? (
          <p className={styles.pickerEmpty}>Chưa có invoice nào.</p>
        ) : (
          <ul className={styles.pickerList}>
            {recent.data.map(inv => (
              <li key={inv.bill}>
                <button type="button" className={styles.pickerItem} onClick={() => { onItems(inv.items.map(toItem), 'replace'); setDialog(null); }}>
                  <span className={styles.pickerText}>
                    <strong>{inv.bill} · {inv.cnee}</strong>
                    <span>{inv.date} · {inv.items.length} mặt hàng · {inv.currency}</span>
                  </span>
                  <span className={styles.pickerGo}>Chép</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
