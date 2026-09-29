import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, FormGrid, Modal, SelectField, TextAreaField, TextField } from '@/shared/ui';
import { useCreateTrouble } from '../api';
import { TROUBLE_PRIORITY, TROUBLE_TYPES } from '../constants';
import type { TroublePriority } from '../types';

const schema = z.object({
  bill: z.string().trim().min(1, 'Nhập mã vận đơn'),
  type: z.string().min(1, 'Chọn loại sự cố'),
  lv: z.enum(['low', 'mid', 'high']),
  desc: z.string().trim().min(10, 'Mô tả tối thiểu 10 ký tự để CS xử lý nhanh'),
  req: z.string().trim().min(1, 'Nhập người yêu cầu'),
  contact: z.string().trim().min(1, 'Nhập SĐT hoặc email liên hệ')
});
type FormValues = z.infer<typeof schema>;

/** Thông tin đơn điền sẵn khi mở từ "Đơn hàng của tôi". */
export interface TroubleContext {
  bill: string;
  cnee?: string;
  ct?: string;
}

interface ReportTroubleDialogProps {
  open: boolean;
  context?: TroubleContext | null;
  onClose: () => void;
}

const PRIORITY_OPTIONS = (Object.keys(TROUBLE_PRIORITY) as TroublePriority[]).map(k => ({ value: k, label: TROUBLE_PRIORITY[k].label }));

/** Hộp thoại báo sự cố — dùng ở trang Sự cố và trong menu thao tác của đơn hàng. */
export function ReportTroubleDialog({ open, context, onClose }: ReportTroubleDialogProps) {
  const create = useCreateTrouble();
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { bill: '', type: TROUBLE_TYPES[0], lv: 'mid', desc: '', req: '', contact: '' }
  });
  const err = (k: keyof FormValues) => formState.errors[k]?.message;

  // Chỉ làm mới form khi mở hộp hoặc đổi đơn — không reset khi trang cha render lại
  const bill = context?.bill ?? '';
  useEffect(() => {
    if (open) reset({ bill, type: TROUBLE_TYPES[0], lv: 'mid', desc: '', req: '', contact: '' });
  }, [open, bill, reset]);

  const submit = handleSubmit(v =>
    create.mutate({ ...v, cnee: context?.cnee, ct: context?.ct }, { onSuccess: onClose })
  );

  return (
    <Modal
      open={open}
      title="Báo cáo sự cố đơn hàng"
      onClose={onClose}
      footerNote="Yêu cầu được gửi tới bộ phận CS Việt An"
      footer={
        <>
          <Button onClick={onClose}>Hủy</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={create.isPending}>
            {create.isPending ? 'Đang gửi…' : 'Gửi yêu cầu'}
          </Button>
        </>
      }
    >
      <form onSubmit={e => void submit(e)} noValidate>
        <FormGrid>
          <TextField label="Mã vận đơn (VA Bill)" required readOnly={!!context?.bill} error={err('bill')} {...register('bill')} />
          <SelectField label="Mức độ" options={PRIORITY_OPTIONS} {...register('lv')} />
          <SelectField label="Loại sự cố" required wide options={TROUBLE_TYPES} error={err('type')} {...register('type')} />
          <TextAreaField label="Mô tả chi tiết" required wide rows={4} placeholder="Điều gì xảy ra, khi nào, bạn mong muốn xử lý thế nào…" error={err('desc')} {...register('desc')} />
          <TextField label="Người yêu cầu" required error={err('req')} {...register('req')} />
          <TextField label="SĐT / email liên hệ" required error={err('contact')} {...register('contact')} />
        </FormGrid>
      </form>
    </Modal>
  );
}
