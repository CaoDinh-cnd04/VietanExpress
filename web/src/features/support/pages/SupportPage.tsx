import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useI18n } from '@/shared/i18n';
import { Button, Card, FormGrid, KeyValueList, PageHeader, SelectField, TextAreaField, TextField } from '@/shared/ui';
import { useSendFeedback } from '../api';
import { CONTACTS, FAQ, FEEDBACK_CATEGORIES } from '../constants';
import styles from './SupportPage.module.css';

const MAX_FILE_MB = 10;

const schema = z.object({
  category: z.string().min(1),
  subject: z.string().trim().min(5, 'Tiêu đề tối thiểu 5 ký tự'),
  message: z.string().trim().min(20, 'Mô tả tối thiểu 20 ký tự'),
  contact: z.string().trim().min(6, 'Nhập SĐT hoặc email để CS liên hệ lại')
});
type FormValues = z.infer<typeof schema>;

const defaults: FormValues = { category: FEEDBACK_CATEGORIES[0], subject: '', message: '', contact: '' };

export default function SupportPage() {
  const { t } = useI18n();
  const send = useSendFeedback();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults });
  const err = (k: keyof FormValues) => formState.errors[k]?.message;

  const submit = handleSubmit(v =>
    send.mutate({ ...v, attachment: file }, { onSuccess: () => { reset(defaults); setFile(null); } })
  );

  const pickFile = (f: File | undefined) => {
    if (f && f.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(t('Tệp tối đa {mb}MB', { mb: MAX_FILE_MB }));
      return setFile(null);
    }
    setFileError('');
    setFile(f ?? null);
  };

  return (
    <>
      <PageHeader title="Trợ giúp & Góp ý" description="Gửi yêu cầu hỗ trợ kèm ảnh / chứng từ, hoặc góp ý để Việt An cải thiện phần mềm." />
      <div className={styles.layout}>
        <Card title="Gửi yêu cầu">
          <form onSubmit={e => void submit(e)} noValidate>
            <FormGrid>
              <SelectField label="Chủ đề" options={FEEDBACK_CATEGORIES} {...register('category')} />
              <TextField label="SĐT / email liên hệ" required error={err('contact')} {...register('contact')} />
              <TextField label="Tiêu đề" required wide error={err('subject')} {...register('subject')} />
              <TextAreaField label="Nội dung" required wide rows={6} error={err('message')} {...register('message')} />
              <TextField
                label="Đính kèm ảnh / chứng từ"
                wide
                type="file"
                accept="image/*,.pdf,.xlsx,.xls,.csv,.doc,.docx"
                hint={file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : t('Tùy chọn, tối đa {mb}MB', { mb: MAX_FILE_MB })}
                error={fileError || undefined}
                onChange={e => pickFile(e.target.files?.[0])}
              />
            </FormGrid>
            <div className={styles.actions}>
              <Button variant="primary" type="submit" disabled={send.isPending}>{t(send.isPending ? 'Đang gửi…' : 'Gửi yêu cầu')}</Button>
            </div>
          </form>
        </Card>

        <div className="page-stack">
          <Card title="Liên hệ nhanh">
            <KeyValueList items={CONTACTS.map(c => [c.label, c.value])} />
          </Card>
          <Card title="Câu hỏi thường gặp">
            <div className={styles.faq}>
              {FAQ.map(f => (
                <details key={f.q}>
                  <summary>{t(f.q)}</summary>
                  <p>{t(f.a)}</p>
                </details>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
