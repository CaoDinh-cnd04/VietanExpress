import { useMemo, useState } from 'react';
import { getErrorMessage, isNotImplemented } from '@/shared/api/http';
import { useI18n } from '@/shared/i18n';
import { Button, Card, DataTable, DropdownMenu, Icon, Modal, Notice, PageHeader, StatusPill, type Column } from '@/shared/ui';
import { useAssignablePermissions, useDeleteStaff, useStaffList, useUpdateStaff } from '../api';
import { ResetPasswordModal } from '../components/ResetPasswordModal';
import { StaffFormModal } from '../components/StaffFormModal';
import { formatIsoDateTime } from '@/shared/lib/format';
import type { StaffAccount } from '../types';
import styles from '../components/staff.module.css';

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit' | 'password' | 'delete'; staff: StaffAccount };

/** Tài khoản nhân viên — tài khoản chính (admin) của khách tạo tài khoản con và chọn quyền cho từng người. */
export default function StaffPage() {
  const { t } = useI18n();
  const list = useStaffList();
  const permissions = useAssignablePermissions();
  const update = useUpdateStaff();
  const [dialog, setDialog] = useState<Dialog>();
  const close = () => setDialog(undefined);

  const descriptions = useMemo(() => new Map(permissions.data?.map(p => [p.code, p.description])), [permissions.data]);
  const describe = (code: string) => descriptions.get(code) ?? code;

  const setActive = (s: StaffAccount, active: boolean) =>
    update.mutate({ id: s.id, body: { fullName: s.fullName, email: s.email ?? null, phone: s.phone ?? null, permissions: s.permissions, active } });

  const columns: Column<StaffAccount>[] = [
    {
      key: 'user',
      header: t('Nhân viên'),
      render: s => (
        <div className={styles.user}>
          <strong>{s.fullName}</strong>
          <span>{s.userName}</span>
        </div>
      )
    },
    {
      key: 'contact',
      header: t('Liên hệ'),
      render: s => (
        <div className={styles.user}>
          <span>{s.email || '—'}</span>
          <span>{s.phone || ''}</span>
        </div>
      )
    },
    {
      key: 'permissions',
      header: t('Quyền'),
      render: s =>
        s.permissions.length ? (
          <div className={styles.tags}>{s.permissions.map(p => <span key={p} className={styles.tag}>{t(describe(p))}</span>)}</div>
        ) : (
          <span className={styles.muted}>{t('Chưa cấp quyền')}</span>
        )
    },
    {
      key: 'status',
      header: t('Trạng thái'),
      width: 120,
      render: s => <StatusPill tone={s.active ? 'success' : 'neutral'}>{s.active ? 'Đang hoạt động' : 'Đã khóa'}</StatusPill>
    },
    {
      key: 'login',
      header: t('Đăng nhập gần nhất'),
      width: 150,
      render: s => <span className={styles.muted}>{formatIsoDateTime(s.lastLoginAt) || t('Chưa đăng nhập')}</span>
    },
    {
      key: 'actions',
      header: '',
      width: 56,
      align: 'right',
      render: s => (
        <DropdownMenu
          items={[
            { label: 'Sửa thông tin & quyền', onSelect: () => setDialog({ kind: 'edit', staff: s }) },
            { label: 'Đặt lại mật khẩu', onSelect: () => setDialog({ kind: 'password', staff: s }) },
            s.active
              ? { label: 'Khóa tài khoản', onSelect: () => setActive(s, false) }
              : { label: 'Mở khóa tài khoản', onSelect: () => setActive(s, true) },
            { label: 'Xóa tài khoản', danger: true, onSelect: () => setDialog({ kind: 'delete', staff: s }) }
          ]}
          trigger={({ open, toggle }) => (
            <Button size="sm" iconOnly variant="ghost" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label={t('Thao tác cho {name}', { name: s.userName })}>
              <Icon name="more" size={16} />
            </Button>
          )}
        />
      )
    }
  ];

  return (
    <>
      <PageHeader
        title="Tài khoản nhân viên"
        description="Tạo tài khoản con cho nhân viên đăng nhập portal và chọn chức năng từng người được dùng."
        actions={
          <Button variant="primary" onClick={() => setDialog({ kind: 'create' })} disabled={list.isError}>
            <Icon name="plus" size={16} /> {t('Thêm nhân viên')}
          </Button>
        }
      />
      {list.isError ? (
        isNotImplemented(list.error) ? (
          <Notice title="Chức năng đang được kết nối máy chủ">{t('Vui lòng thử lại sau.')}</Notice>
        ) : (
          <Notice tone="danger" title="Không tải được danh sách nhân viên">{t(getErrorMessage(list.error))}</Notice>
        )
      ) : (
        <Card>
          <DataTable
            columns={columns}
            rows={list.data ?? []}
            rowKey={s => String(s.id)}
            loading={list.isPending}
            minWidth={860}
            empty={{
              title: 'Chưa có tài khoản nhân viên',
              description: 'Thêm nhân viên để họ đăng nhập bằng tài khoản riêng, không cần dùng chung mật khẩu công ty.',
              action: <Button variant="primary" onClick={() => setDialog({ kind: 'create' })}>{t('Thêm nhân viên')}</Button>
            }}
          />
        </Card>
      )}

      {dialog?.kind === 'create' && <StaffFormModal onClose={close} />}
      {dialog?.kind === 'edit' && <StaffFormModal key={dialog.staff.id} staff={dialog.staff} onClose={close} />}
      {dialog?.kind === 'password' && <ResetPasswordModal staff={dialog.staff} onClose={close} />}
      {dialog?.kind === 'delete' && <DeleteStaffModal staff={dialog.staff} onClose={close} />}
    </>
  );
}

function DeleteStaffModal({ staff, onClose }: { staff: StaffAccount; onClose: () => void }) {
  const { t } = useI18n();
  const remove = useDeleteStaff();
  return (
    <Modal
      open
      title={t('Xóa tài khoản {name}?', { name: staff.userName })}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('Hủy')}</Button>
          <Button variant="danger" disabled={remove.isPending} onClick={() => remove.mutate(staff.id, { onSuccess: onClose })}>
            {t(remove.isPending ? 'Đang xóa…' : 'Xóa tài khoản')}
          </Button>
        </>
      }
    >
      <p>{t('Nhân viên {name} sẽ không đăng nhập được nữa. Đơn hàng đã tạo vẫn giữ nguyên trong tài khoản công ty.', { name: staff.fullName })}</p>
    </Modal>
  );
}
