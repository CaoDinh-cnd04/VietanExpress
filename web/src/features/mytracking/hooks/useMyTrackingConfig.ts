import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { emptyConfig, myTrackingSchema, type MyTrackingConfig } from '../schema';
import type { ConfigRepository } from '../repositories/ConfigRepository';
import { LocalStorageConfigRepository } from '../repositories/LocalStorageConfigRepository';
const localRepository = new LocalStorageConfigRepository();
export function useMyTrackingConfig(userId: string, repository: ConfigRepository = localRepository) {
  const form = useForm<MyTrackingConfig>({ resolver: zodResolver(myTrackingSchema), defaultValues: emptyConfig(), mode: 'onBlur' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; warning: boolean }>();
  const { reset } = form;
  useEffect(() => {
    let active = true;
    setLoading(true);
    repository.load(userId).then(result => {
      if (!active) return;
      reset(result.config);
      setFeedback(result.warning ? { message: result.warning, warning: true } : undefined);
    }).catch(() => {
      if (active) setFeedback({ message: 'Không tải được cấu hình. Bạn vẫn có thể chỉnh sửa bản mới.', warning: true });
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [repository, userId, reset]);
  const save = form.handleSubmit(async values => {
    setSaving(true);
    try {
      const result = await repository.save(userId, values);
      reset(values);
      setFeedback({ message: result.warning ?? 'Đã lưu bản thử nghiệm trên trình duyệt', warning: !result.persistent });
    } catch { setFeedback({ message: 'Không lưu được cấu hình. Nội dung chỉnh sửa vẫn được giữ lại.', warning: true }); }
    finally { setSaving(false); }
  });
  // Khôi phục chỉ sửa form; giữ mốc đã lưu để báo đúng thay đổi chưa lưu.
  const restoreDefaults = () => { reset(emptyConfig(), { keepDefaultValues: true }); setFeedback(undefined); };
  return { form, config: form.watch(), loading, saving, feedback, save, restoreDefaults };
}
