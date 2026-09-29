import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { BRANCHES } from '@/shared/config/domain';
import { formatIsoDate, todayIso } from '@/shared/lib/format';
import { Button, Card, EmptyState, FormGrid, PageHeader, SelectField, StatusPill, TextAreaField, TextField, type Tone } from '@/shared/ui';
import { useCreatePickup, usePickups, type PickupStatus } from '../api';
import styles from './PickupsPage.module.css';

const PICKUP_SLOTS = ['09:00 – 12:00', '13:00 – 17:00', '17:00 – 19:00'] as const;

const PICKUP_STATUS: Record<PickupStatus, { label: string; tone: Tone }> = {
  wait: { label: 'Chờ xác nhận', tone: 'info' },
  ok: { label: 'Đã lấy hàng', tone: 'brand' }
};

const optionalNumber = z.string().refine(v => v.trim() === '' || Number(v) >= 0, 'Số không hợp lệ');
const schema = z.object({
  date: z.string().min(1, 'Chọn ngày').refine(v => v >= todayIso(), 'Không chọn ngày trong quá khứ'),
  slot: z.string().min(1, 'Chọn khung giờ'),
  branch: z.string().min(1, 'Chọn chi nhánh'),
  address: z.string().trim().min(1, 'Nhập địa chỉ lấy hàng'),
  contact: z.string().trim().min(1, 'Nhập người liên hệ'),
  phone: z.string().trim().min(8, 'Số điện thoại không hợp lệ'),
  pcs: optionalNumber,
  weightKg: optionalNumber,
  note: z.string()
});
type FormValues = z.infer<typeof schema>;

const defaults = (): FormValues => ({ date: todayIso(1), slot: '', branch: 'TP.HCM', address: '', contact: '', phone: '', pcs: '', weightKg: '', note: '' });

export default function PickupsPage() {
  const { data = [], isLoading } = usePickups();
  const create = useCreatePickup();
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults() });
  const err = (k: keyof FormValues) => formState.errors[k]?.message;

  const submit = handleSubmit(v =>
    create.mutate(
      { ...v, pcs: Number(v.pcs) || 1, weightKg: v.weightKg ? Number(v.weightKg) : undefined },
      { onSuccess: () => reset(defaults()) }
    )
  );

  return (
    <>
      <PageHeader title="Đặt lịch lấy hàng (Pickup)" description="Nhân viên Việt An tới tận nơi lấy hàng. Bạn sẽ nhận email xác nhận lịch." />
      <div className={styles.layout}>
        <Card title="Yêu cầu lấy hàng mới">
          <form onSubmit={e => void submit(e)} noValidate>
            <FormGrid>
              <TextField label="Ngày lấy hàng" required type="date" min={todayIso()} error={err('date')} {...register('date')} />
              <SelectField label="Khung giờ" required placeholder="Chọn khung giờ" options={PICKUP_SLOTS} error={err('slot')} {...register('slot')} />
              <TextField label="Địa chỉ lấy hàng" required wide error={err('address')} {...register('address')} />
              <TextField label="Người liên hệ" required error={err('contact')} {...register('contact')} />
              <TextField label="Số điện thoại" required type="tel" error={err('phone')} {...register('phone')} />
              <TextField label="Số kiện dự kiến" type="number" min={1} suffix="kiện" error={err('pcs')} {...register('pcs')} />
              <TextField label="Tổng cân dự kiến" type="number" min={0} step="any" suffix="kg" error={err('weightKg')} {...register('weightKg')} />
              <SelectField label="Chi nhánh phụ trách" required options={BRANCHES} error={err('branch')} {...register('branch')} />
              <TextAreaField label="Ghi chú cho nhân viên" wide rows={2} placeholder="Loại hàng, lối vào kho, lưu ý…" {...register('note')} />
            </FormGrid>
            <div className={styles.actions}>
              <Button variant="primary" type="submit" disabled={create.isPending}>{create.isPending ? 'Đang gửi…' : 'Gửi yêu cầu pickup'}</Button>
            </div>
          </form>
        </Card>

        <Card title="Lịch pickup gần đây">
          {!isLoading && !data.length ? (
            <EmptyState title="Chưa có lịch pickup" />
          ) : (
            <ul className={styles.list}>
              {data.map(p => (
                <li key={p.id} className={styles.item}>
                  <div className={styles.itemText}>
                    <strong>{formatIsoDate(p.date)} · {p.slot}</strong>
                    <span>{p.pcs} kiện dự kiến{p.branch ? ` · ${p.branch}` : ''}</span>
                    {p.address && <span>{p.address}</span>}
                  </div>
                  <StatusPill tone={PICKUP_STATUS[p.st]?.tone ?? 'neutral'}>{PICKUP_STATUS[p.st]?.label ?? p.stx ?? p.st}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
