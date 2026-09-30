import { useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { formatIsoDate, formatPercent } from '@/shared/lib/format';
import { Button, Card, EmptyState, Icon, Modal } from '@/shared/ui';
import { useDeleteService, useServices } from '../api';
import { emptyService } from '../lib/pricing';
import type { ShippingService } from '../types';
import { ServiceEditor } from './ServiceEditor';
import styles from './pricing.module.css';

/** Tab "Quản lý & nhập giá": danh sách dịch vụ, thêm / sửa / xóa bảng giá. */
export function ServiceManager() {
  const { t } = useI18n();
  const { data: services = [], isLoading } = useServices();
  const remove = useDeleteService();
  const [editing, setEditing] = useState<{ svc: ShippingService; isNew: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ShippingService | null>(null);

  if (editing) return <ServiceEditor key={editing.svc.id || 'new'} initial={editing.svc} isNew={editing.isNew} onDone={() => setEditing(null)} />;

  return (
    <div className={styles.stack}>
      <div className={styles.editorHead}>
        <h2>{t('Dịch vụ & bảng giá ({n})', { n: services.length })}</h2>
        <Button variant="primary" onClick={() => setEditing({ svc: emptyService(), isNew: true })}><Icon name="plus" size={15} /> {t('Thêm dịch vụ')}</Button>
      </div>

      {!isLoading && !services.length ? (
        <Card><EmptyState title="Chưa có dịch vụ" description='Bấm "Thêm dịch vụ" để khai bảng giá.' /></Card>
      ) : (
        <div className={styles.cardGrid}>
          {services.map(s => (
            <article key={s.id} className={styles.svcCard}>
              <h3>{s.name}</h3>
              <div className={styles.meta}>
                {s.account && <span>{t('Tài khoản')} <strong>{s.account}</strong></span>}
                <span>FSC <strong>{formatPercent(s.fsc)}</strong></span>
                <span>VAT <strong>{formatPercent(s.vat)}</strong></span>
                <span>{t('{zones} zone · {countries} nước', { zones: s.zones.length, countries: Object.keys(s.zmap).length })}</span>
                {s.effTo && <span>{t('Hiệu lực đến')} <strong>{formatIsoDate(s.effTo)}</strong></span>}
              </div>
              <div className={styles.svcActions}>
                <Button size="sm" onClick={() => setEditing({ svc: structuredClone(s), isNew: false })}><Icon name="edit" size={15} /> {t('Sửa')}</Button>
                <Button size="sm" variant="danger" onClick={() => setConfirmDelete(s)}><Icon name="trash" size={15} /> {t('Xóa')}</Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={!!confirmDelete}
        title="Xóa dịch vụ?"
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <Button onClick={() => setConfirmDelete(null)}>{t('Hủy')}</Button>
            <Button variant="danger" disabled={remove.isPending} onClick={() => confirmDelete && remove.mutate(confirmDelete.id, { onSuccess: () => setConfirmDelete(null) })}>
              {t('Xóa bảng giá')}
            </Button>
          </>
        }
      >
        {t('Bảng giá')} <strong>{confirmDelete?.name}</strong> {t('sẽ bị xóa và không dùng để tra cứu nữa. Thao tác không hoàn tác được.')}
      </Modal>
    </div>
  );
}
