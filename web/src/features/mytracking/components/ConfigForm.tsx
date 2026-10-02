import { useRef, useState, type FormEventHandler } from 'react';
import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { useI18n } from '@/shared/i18n';
import { Button, Icon, TextAreaField, TextField, useToast } from '@/shared/ui';
import { isWebUrl, MAX_AD_IMAGES, type MyTrackingConfig } from '../schema';
import { readImage, validateImageUrl } from '../lib/images';
import { ConfigImage } from './ConfigImage';
import styles from '../pages/MyTrackingPage.module.css';
interface Props { form: UseFormReturn<MyTrackingConfig>; onSave: FormEventHandler<HTMLFormElement>; onRestore: () => void; disabled: boolean }
const socialFields = ['facebook', 'instagram', 'x', 'zalo', 'whatsapp'] as const;
const socialLabels = { facebook: 'Facebook', instagram: 'Instagram', x: 'X', zalo: 'Zalo', whatsapp: 'WhatsApp' };
export function ConfigForm({ form, onSave, onRestore, disabled }: Props) {
  const { t } = useI18n();
  const { register, control, setValue, getValues, formState: { errors } } = form;
  const { fields, append, remove, move } = useFieldArray({ control, name: 'images', keyName: 'fieldKey' });
  const dragId = useRef<string | undefined>(undefined);
  const [uploads, setUploads] = useState(0);
  const config = form.watch();
  const busy = disabled || uploads > 0;
  const onBusy = (loading: boolean) => setUploads(count => count + (loading ? 1 : -1));
  const addImage = (src: string) => { if (getValues('images').length < MAX_AD_IMAGES) append({ id: crypto.randomUUID(), src, linkUrl: '' }); };
  return <form className={styles.card} onSubmit={onSave} noValidate>
    <h2 className={styles.cardTitle}>{t('Nội dung hiển thị chính')}</h2>
    <fieldset className={styles.formBody} disabled={busy}>
      <section className={styles.group}>
        <TextField label="Tiêu đề" required maxLength={120} error={errors.title?.message} {...register('title')} />
        <TextAreaField label="Mô tả" rows={4} maxLength={2000} error={errors.description?.message} {...register('description')} />
      </section>
      <section className={styles.group}>
        <div className={styles.groupHeading}><h3>{t('Hình ảnh quảng cáo')}</h3><span>{t('Số lượng: {n}/5', { n: fields.length })}</span></div>
        <ImagePicker onAdd={addImage} disabled={fields.length >= MAX_AD_IMAGES} onBusy={onBusy} />
        <p className={styles.hint}>{t('Kéo tay cầm để đổi thứ tự ảnh hoặc dùng nút lên / xuống.')}</p>
        {fields.map((field, index) => <div className={styles.imageRow} key={field.fieldKey} onDragOver={e => e.preventDefault()} onDrop={e => {
          e.preventDefault(); const from = fields.findIndex(item => item.id === dragId.current);
          if (from >= 0 && from !== index && !busy) move(from, index); dragId.current = undefined;
        }}>
          <button type="button" className={styles.dragHandle} draggable={!busy} aria-label={t('Di chuyển ảnh {n}', { n: index + 1 })}
            onDragStart={e => { dragId.current = field.id; e.dataTransfer.setData('text/plain', field.id); e.dataTransfer.effectAllowed = 'move'; }}
            onDragEnd={() => { dragId.current = undefined; }}><Icon name="menu" size={16} /></button>
          <ConfigImage src={field.src} alt={t('Ảnh quảng cáo {n}', { n: index + 1 })} className={styles.thumbnail} />
          <TextField label={t('Link đính kèm ảnh {n}', { n: index + 1 })} placeholder="https://" error={errors.images?.[index]?.linkUrl?.message} {...register(`images.${index}.linkUrl`)} />
          <div className={styles.reorder}>
            <Button size="sm" iconOnly disabled={index === 0} aria-label={t('Đưa ảnh lên')} onClick={() => move(index, index - 1)}><span className={styles.up}><Icon name="chevronDown" size={14} /></span></Button>
            <Button size="sm" iconOnly disabled={index === fields.length - 1} aria-label={t('Đưa ảnh xuống')} onClick={() => move(index, index + 1)}><Icon name="chevronDown" size={14} /></Button>
            <Button size="sm" iconOnly variant="danger" aria-label={t('Xóa ảnh {n}', { n: index + 1 })} onClick={() => remove(index)}><Icon name="trash" size={14} /></Button>
          </div>
        </div>)}
      </section>
      <section className={styles.group}>
        <h3>{t('Hình ảnh background')}</h3>
        <ImagePicker onAdd={src => setValue('background', src, { shouldDirty: true, shouldValidate: true })} onBusy={onBusy} />
        {config.background && <div className={styles.imagePreview}><ConfigImage src={config.background} alt={t('Hình ảnh nền')} className={styles.smallPreview} /><Button size="sm" onClick={() => setValue('background', '', { shouldDirty: true })}>{t('Xóa hình nền')}</Button></div>}
      </section>
      <section className={styles.group}>
        <h3>{t('Thông tin thương hiệu')}</h3>
        <ImagePicker label="Logo" onAdd={src => setValue('brand.logo', src, { shouldDirty: true, shouldValidate: true })} onBusy={onBusy} />
        {config.brand.logo && <div className={styles.imagePreview}><ConfigImage src={config.brand.logo} alt="Logo" className={styles.thumbnail} /><Button size="sm" onClick={() => setValue('brand.logo', '', { shouldDirty: true })}>{t('Xóa logo')}</Button></div>}
        <TextField label="Tên công ty" maxLength={150} error={errors.brand?.companyName?.message} {...register('brand.companyName')} />
        <TextField label="Địa chỉ" maxLength={500} error={errors.brand?.address?.message} {...register('brand.address')} />
        <TextField label="Số điện thoại" type="tel" maxLength={50} error={errors.brand?.phone?.message} {...register('brand.phone')} />
        <div className={styles.socialForm}>{socialFields.map(key => <TextField key={key} label={socialLabels[key]} placeholder="https://" error={errors.brand?.[key]?.message} {...register(`brand.${key}`)} />)}</div>
      </section>
      <div className={styles.actions}><Button type="submit" variant="primary">{t('Lưu bản thử nghiệm')}</Button><Button onClick={onRestore}>{t('Khôi phục mặc định')}</Button><span title={t('Sắp ra mắt')}><Button disabled>{t('Xuất bản')}</Button></span></div>
    </fieldset>
  </form>;
}
function ImagePicker({ onAdd, disabled, onBusy, label }: { onAdd: (src: string) => void; disabled?: boolean; onBusy: (busy: boolean) => void; label?: string }) {
  const { t } = useI18n(); const toast = useToast(); const fileInput = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(''); const [loading, setLoading] = useState(false);
  const addFromUrl = async () => {
    if (disabled || loading || !url.trim()) return;
    const src = url.trim();
    if (!isWebUrl(src)) { toast.show(t('Link phải bắt đầu bằng http:// hoặc https://'), 'error'); return; }
    setLoading(true); onBusy(true);
    try { onAdd(await validateImageUrl(src)); setUrl(''); }
    catch (error) { toast.show(t(error instanceof Error ? error.message : 'Không đọc được hình ảnh'), 'error'); }
    finally { setLoading(false); onBusy(false); }
  };
  return <div>
    {label && <p className={styles.hint}>{t(label)}</p>}
    <div className={styles.source}>
      <Button disabled={disabled || loading} onClick={() => fileInput.current?.click()}><Icon name="upload" size={14} /> {t('Thêm ảnh mới')}</Button>
      <TextField label="Nhập URL ảnh từ internet" placeholder="https://" value={url} disabled={disabled || loading} onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void addFromUrl(); } }} />
      <Button disabled={disabled || loading || !url.trim()} onClick={addFromUrl}>{t(loading ? 'Đang xử lý ảnh…' : 'Thêm từ URL')}</Button>
    </div>
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={disabled || loading} onChange={async e => {
      const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (!file) return;
      setLoading(true); onBusy(true);
      try { onAdd(await readImage(file)); } catch (error) { toast.show(t(error instanceof Error ? error.message : 'Không đọc được hình ảnh'), 'error'); }
      finally { setLoading(false); onBusy(false); }
    }} />
    <p className={styles.hint}>{t('JPG, JPEG, PNG, WebP · tối đa 200 KB')}</p>
    <p className={styles.hint}>{t('URL phải là link trực tiếp tới ảnh. Ảnh từ URL dùng link gốc, không nén.')}</p>
  </div>;
}
