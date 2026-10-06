import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useI18n } from '@/shared/i18n';
import { Button, Modal, Notice, TextField } from '@/shared/ui';
import { useResetStaffPassword } from '../api';
import { resetPasswordSchema, type ResetPasswordValues } from '../schema';
import type { StaffAccount } from '../types';

/** Admin đặt mật khẩu mới cho nhân viên (quên mật khẩu) — nhân viên phải đăng nhập lại. */
export function ResetPasswordModal({ staff, onClose }: { staff: StaffAccount; onClose: () => void }) {
  const { t } = useI18n();
  const reset = useResetStaffPassword();
  const { register, handleSubmit, formState } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' }
  });

  const submit = handleSubmit(({ newPassword }) => reset.mutate({ id: staff.id, newPassword }, { onSuccess: onClose }));

  return (
    <Modal
      open
      title={t('Đặt lại mật khẩu cho {name}', { name: staff.userName })}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('Hủy')}</Button>
          <Button variant="primary" type="submit" form="reset-staff-password" disabled={reset.isPending}>
            {t(reset.isPending ? 'Đang lưu…' : 'Đặt lại mật khẩu')}
          </Button>
        </>
      }
    >
      <form id="reset-staff-password" onSubmit={e => void submit(e)} noValidate className="page-stack">
        <TextField label="Mật khẩu mới" required type="password" autoComplete="new-password" hint="Tối thiểu 8 ký tự, gồm cả chữ và số" error={formState.errors.newPassword?.message} {...register('newPassword')} />
        <TextField label="Nhập lại mật khẩu mới" required type="password" autoComplete="new-password" error={formState.errors.confirmPassword?.message} {...register('confirmPassword')} />
        <Notice>{t('Nhân viên sẽ bị đăng xuất khỏi mọi thiết bị và đăng nhập lại bằng mật khẩu mới.')}</Notice>
      </form>
    </Modal>
  );
}
