import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { Button, DropdownMenu, Icon } from '@/shared/ui';
import { usePrintDocuments, type PrintDoc } from '../mutations';
import type { Order, OrderActions } from '../types';
import styles from './OrderRowActions.module.css';

/** Nút in chứng từ đặt thẳng trên dòng như hệ thống cũ (không phải mở menu). */
const PRINT_BUTTONS: ReadonlyArray<{ doc: PrintDoc; label: string; tone: 'print' | 'doc' }> = [
  { doc: 'bill-a4', label: 'In Bill A4', tone: 'print' },
  { doc: 'invoice', label: 'In Invoice', tone: 'print' },
  { doc: 'cvck', label: 'CVCK', tone: 'doc' }
];

/** Cột in: Bill A4 · Invoice · CVCK xếp dọc. */
export function PrintButtons({ order }: { order: Order }) {
  const { t } = useI18n();
  const print = usePrintDocuments();
  return (
    <div className={styles.stack}>
      {PRINT_BUTTONS.map(b => (
        <button key={b.doc} type="button" className={cx(styles.pill, styles[b.tone])} onClick={() => void print([order.bill], b.doc)}>
          {t(b.label)}
        </button>
      ))}
    </div>
  );
}

/** Cột nhãn: In nhãn A6. */
export function LabelButton({ order }: { order: Order }) {
  const { t } = useI18n();
  const print = usePrintDocuments();
  return (
    <button type="button" className={cx(styles.pill, styles.print, styles.tall)} onClick={() => void print([order.bill], 'label-a6')}>
      {t('In nhãn A6')}
    </button>
  );
}

/** Thao tác khác của 1 đơn: xem chi tiết, ảnh kiện, nhân bản, báo sự cố. */
export function MoreActions({ order, actions }: { order: Order; actions: OrderActions }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const items = [
    { label: 'Xem chi tiết đơn', onSelect: () => actions.onOpen(order) },
    { label: order.photos ? t('Xem ảnh kiện hàng ({n})', { n: order.photos }) : t('Xem ảnh kiện hàng'), onSelect: () => actions.onPhotos(order) },
    { label: 'Copy đơn', onSelect: () => navigate(`/orders/new?from=${order.bill}`) },
    { label: 'Báo sự cố', onSelect: () => actions.onTrouble(order) }
  ];
  return (
    <DropdownMenu
      items={items}
      trigger={({ open, toggle }) => (
        <Button size="sm" iconOnly variant="ghost" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label={t('Thao tác khác cho đơn {bill}', { bill: order.bill })}>
          <Icon name="more" size={16} />
        </Button>
      )}
    />
  );
}
