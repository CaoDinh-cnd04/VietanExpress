import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/shared/i18n';
import { Button, DropdownMenu, Icon } from '@/shared/ui';
import { PRINT_DOCUMENTS } from '../constants';
import { useCancelOrder, usePrintDocuments } from '../mutations';
import type { Order, OrderActions } from '../types';
import styles from './OrderRowActions.module.css';

interface OrderRowActionsProps {
  order: Order;
  actions: OrderActions;
}

/** Cột "In bill": menu in chứng từ + menu thao tác khác của một đơn. */
export function OrderRowActions({ order, actions }: OrderRowActionsProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const print = usePrintDocuments();
  const cancel = useCancelOrder();

  const moreItems = [
    { label: 'Xem chi tiết đơn', onSelect: () => actions.onOpen(order) },
    { label: order.photos ? t('Xem ảnh kiện hàng ({n})', { n: order.photos }) : t('Xem ảnh kiện hàng'), onSelect: () => actions.onPhotos(order) },
    { label: 'Nhân bản đơn', onSelect: () => navigate(`/orders/new?from=${order.bill}`) },
    { label: 'Báo sự cố', onSelect: () => actions.onTrouble(order) },
    ...(order.st === 'wait' ? [{ label: 'Hủy đơn', danger: true, onSelect: () => cancel.mutate(order.bill) }] : [])
  ];

  return (
    <div className={styles.actions}>
      <DropdownMenu
        items={PRINT_DOCUMENTS.map(d => ({ label: d.label, onSelect: () => void print([order.bill], d.key) }))}
        trigger={({ open, toggle }) => (
          <Button size="sm" onClick={toggle} aria-expanded={open} aria-haspopup="menu" className={styles.print}>
            {t('In')} <Icon name="chevronDown" size={14} />
          </Button>
        )}
      />
      <DropdownMenu
        items={moreItems}
        trigger={({ open, toggle }) => (
          <Button size="sm" iconOnly onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label={t('Thao tác khác cho đơn {bill}', { bill: order.bill })}>
            <Icon name="more" size={16} />
          </Button>
        )}
      />
    </div>
  );
}
