import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useI18n } from '@/shared/i18n';
import { Button, Card, FormGrid, Notice, PageHeader, TextField } from '@/shared/ui';
import { useChangePassword } from '../api';
import styles from './account.module.css';

/** Quy tắc mật khẩu — đồng bộ với backend. */
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
    newPassword: z.string().regex(PASSWORD_RULE, 'Tối thiểu 8 ký tự, gồm cả chữ và số'),
    confirmPassword: z.string()
  })
  .refine(v => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Mật khẩu nhập lại không khớp' })
  .refine(v => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'Mật khẩu mới phải khác mật khẩu hiện tại' });
type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function ChangePasswordPage() {
  const { t } = useI18n();
  const change = useChangePassword();
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const err = (k: keyof FormValues) => formState.errors[k]?.message;

  const submit = handleSubmit(({ currentPassword, newPassword }) =>
    change.mutate({ currentPassword, newPassword }, { onSuccess: () => reset(EMPTY) })
  );

  return (
    <>
      <PageHeader title="Đổi mật khẩu" />
      <div className={styles.narrow}>
        <Card>
          <form onSubmit={e => void submit(e)} noValidate className="page-stack">
            <FormGrid columns={2}>
              <TextField label="Mật khẩu hiện tại" required wide type="password" autoComplete="current-password" error={err('currentPassword')} {...register('currentPassword')} />
              <TextField label="Mật khẩu mới" required wide type="password" autoComplete="new-password" hint="Tối thiểu 8 ký tự, gồm cả chữ và số" error={err('newPassword')} {...register('newPassword')} />
              <TextField label="Nhập lại mật khẩu mới" required wide type="password" autoComplete="new-password" error={err('confirmPassword')} {...register('confirmPassword')} />
            </FormGrid>
            <Notice>{t('Sau khi đổi, các phiên đăng nhập trên thiết bị khác sẽ phải đăng nhập lại.')}</Notice>
            <div className={styles.actions}>
              <Button variant="primary" type="submit" disabled={change.isPending}>{t(change.isPending ? 'Đang lưu…' : 'Đổi mật khẩu')}</Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
