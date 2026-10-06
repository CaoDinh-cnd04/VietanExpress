import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useI18n } from '@/shared/i18n';
import { Button, FormGrid, Modal, Notice, TextField } from '@/shared/ui';
import { useAssignablePermissions, useCreateStaff, useUpdateStaff } from '../api';
import { groupPermissions, togglePermission, toProfile } from '../lib/staff';
import { staffSchema, type StaffFormValues } from '../schema';
import type { StaffAccount } from '../types';
import styles from './staff.module.css';

/** Thêm nhân viên (staff = undefined) hoặc sửa thông tin / quyền của nhân viên. */
export function StaffFormModal({ staff, onClose }: { staff?: StaffAccount; onClose: () => void }) {
  const { t } = useI18n();
  const isNew = !staff;
  const permissions = useAssignablePermissions();
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const pending = create.isPending || update.isPending;

  const { register, control, handleSubmit, formState } = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      isNew,
      userName: '',
      password: '',
      confirmPassword: '',
      fullName: staff?.fullName ?? '',
      email: staff?.email ?? '',
      phone: staff?.phone ?? '',
      permissions: staff?.permissions ?? []
    }
  });
  const err = (k: keyof StaffFormValues) => formState.errors[k]?.message;

  const submit = handleSubmit(values => {
    const profile = toProfile(values);
    if (staff) update.mutate({ id: staff.id, body: { ...profile, active: staff.active } }, { onSuccess: onClose });
    else create.mutate({ ...profile, userName: values.userName.trim(), password: values.password }, { onSuccess: onClose });
  });

  return (
    <Modal
      open
      size="lg"
      title={isNew ? 'Thêm tài khoản nhân viên' : t('Sửa tài khoản {name}', { name: staff.userName })}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('Hủy')}</Button>
          <Button variant="primary" type="submit" form="staff-form" disabled={pending}>
            {t(pending ? 'Đang lưu…' : isNew ? 'Tạo tài khoản' : 'Lưu thay đổi')}
          </Button>
        </>
      }
    >
      <form id="staff-form" onSubmit={e => void submit(e)} noValidate className="page-stack">
        <FormGrid columns={2}>
          {isNew && (
            <>
              <TextField label="Tên đăng nhập" required wide autoComplete="off" hint="Nhân viên dùng tên này để đăng nhập portal" error={err('userName')} {...register('userName')} />
              <TextField label="Mật khẩu" required type="password" autoComplete="new-password" hint="Tối thiểu 8 ký tự, gồm cả chữ và số" error={err('password')} {...register('password')} />
              <TextField label="Nhập lại mật khẩu" required type="password" autoComplete="new-password" error={err('confirmPassword')} {...register('confirmPassword')} />
            </>
          )}
          <TextField label="Họ tên" required wide error={err('fullName')} {...register('fullName')} />
          <TextField label="Email" type="email" error={err('email')} {...register('email')} />
          <TextField label="Số điện thoại" type="tel" error={err('phone')} {...register('phone')} />
        </FormGrid>

        <fieldset className={styles.permissions}>
          <legend>{t('Quyền sử dụng')}</legend>
          <p className={styles.hint}>
            {t('Nhân viên chỉ thấy đơn hàng do mình tạo, trừ khi được chọn "Xem toàn bộ đơn của công ty". Đơn e-commerce thì ai có quyền e-commerce đều thấy. MyTracking và quản lý nhân viên chỉ dành cho tài khoản chính.')}
          </p>
          {permissions.isError ? (
            <Notice tone="danger">{t('Không tải được danh sách quyền. Vui lòng thử lại.')}</Notice>
          ) : permissions.isPending ? (
            <p className={styles.hint}>{t('Đang tải…')}</p>
          ) : (
            <Controller
              control={control}
              name="permissions"
              render={({ field }) => (
                <div className={styles.permissionGroups}>
                  {groupPermissions(permissions.data).map(group => (
                    <div key={group.key} className={styles.permissionGroup}>
                      <strong>{t(group.label)}</strong>
                      {group.items.map(p => (
                        <label key={p.code} className={styles.check}>
                          <input
                            type="checkbox"
                            checked={field.value.includes(p.code)}
                            onChange={e => field.onChange(togglePermission(field.value, p.code, e.target.checked))}
                          />
                          <span>{t(p.description)}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            />
          )}
        </fieldset>
      </form>
    </Modal>
  );
}
