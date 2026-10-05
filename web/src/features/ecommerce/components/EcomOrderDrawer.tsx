import { useEffect } from 'react';
import { useI18n } from '@/shared/i18n';
import { formatNumber } from '@/shared/lib/format';
import { useCopyToClipboard } from '@/shared/lib/useCopyToClipboard';
import { Icon, Sheet, SheetBox, SheetFields, SheetLines, SheetName, SheetRow, SheetTable, SheetTotals, StatusPill } from '@/shared/ui';
import { ECOM_SOURCES } from '../constants';
import { displayStatus, formatMoney, receiverLines } from '../lib/order-view';
import type { EcomOrder } from '../types';
import styles from './EcomOrderDrawer.module.css';

/** Ngăn chi tiết 1 đơn E-commerce: người nhận, đơn hàng, sản phẩm — dữ liệu có sẵn trong dòng của GET /ecom/orders. */
export function EcomOrderDrawer({ order, onClose }: { order: EcomOrder | null; onClose: () => void }) {
  const { t } = useI18n();
  const copy = useCopyToClipboard();

  useEffect(() => {
    if (!order) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [order, onClose]);

  if (!order) return null;
  const o = order;
  const r = o.receiver;
  const status = displayStatus(o);
  const products = o.products ?? [];
  const money = (n: number | null | undefined) => formatMoney(n, o.currency, formatNumber);
  const itemsTotal = products.reduce((sum, p) => sum + p.sellingPrice * p.qty, 0);

  return (
    <>
      <div className={styles.scrim} onClick={onClose} />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="ecom-drawer-title">
        <header className={styles.header}>
          <div className={styles.headMain}>
            <p className={styles.kicker}>{t('Đơn {source}', { source: t(ECOM_SOURCES[o.src]?.label ?? o.src) })}</p>
            <h2 id="ecom-drawer-title" className={styles.title}>
              {o.ref}
              <button type="button" className={styles.iconBtn} onClick={() => void copy(o.ref, t('Đã sao chép mã đơn'))} aria-label={t('Sao chép mã đơn')} title={t('Sao chép mã đơn')}>
                <Icon name="copy" size={14} />
              </button>
            </h2>
            <p className={styles.headMeta}>
              <StatusPill tone={status.tone}>{t(status.label)}</StatusPill> · {o.createdAt}
            </p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label={t('Đóng')}>
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className={styles.body}>
          <Sheet>
            <SheetRow>
              <SheetBox no={1} title="Người nhận">
                <SheetName>{r?.name || o.cnee || '—'}</SheetName>
                {r?.company && <SheetLines lines={[r.company]} />}
                <SheetLines lines={receiverLines(r, o.ct)} />
                <SheetFields items={[['Điện thoại', r?.phone ?? ''], ['Email', r?.email ?? '']]} />
              </SheetBox>
              <SheetBox no={2} title="Đơn hàng">
                <SheetFields
                  items={[
                    ['VA Bill', o.bill ? <span className="mono">{o.bill}</span> : t('Chưa tạo')],
                    ['Giá trị đơn', money(o.value)],
                    ['Cân nặng', o.kg ? `${formatNumber(o.kg)} kg` : t('Chờ cân')],
                    ['Dịch vụ', [o.service, o.hub].filter(Boolean).join(' · ')],
                    ['Chi nhánh gửi', o.branch ?? '']
                  ]}
                />
              </SheetBox>
            </SheetRow>

            <SheetBox no={3} title="Sản phẩm" aside={t('{n} SP', { n: o.items })}>
              {products.length ? (
                <>
                  <SheetTable
                    head={['Tên hàng', 'SKU', 'Mã HS', 'SL', 'Đơn giá', 'Thành tiền']}
                    numeric={[3, 4, 5]}
                    rows={products.map(p => [p.name, p.sku || '—', p.hsCode || '—', formatNumber(p.qty), money(p.sellingPrice), money(p.sellingPrice * p.qty)])}
                  />
                  <SheetTotals items={[['Tổng tiền hàng', money(itemsTotal)]]} />
                </>
              ) : (
                <p className={styles.muted}>{t('Sàn chưa gửi danh sách sản phẩm.')}</p>
              )}
            </SheetBox>

            {o.note && (
              <SheetBox no={4} title="Ghi chú của shop">
                <SheetLines lines={[o.note]} />
              </SheetBox>
            )}
          </Sheet>
          {!r?.address1 && o.src === 'shopify' && (
            <p className={styles.muted}>
              {t('Chưa có địa chỉ người nhận: app Shopify cần được cấp quyền dữ liệu khách hàng (Protected customer data), rồi bấm Đồng bộ lại.')}
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
