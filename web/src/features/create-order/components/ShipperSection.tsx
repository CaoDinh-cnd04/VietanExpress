import { useEffect, useState } from 'react';
import { useFormContext, useFormState, useWatch } from 'react-hook-form';
import { useSession } from '@/features/auth';
import { BRANCHES } from '@/shared/config/domain';
import { useI18n } from '@/shared/i18n';
import { sanitizePhone } from '@/shared/lib/phone';
import { cx } from '@/shared/lib/cx';
import { Button, Card, FormGrid, Icon, SelectField, TextField } from '@/shared/ui';
import { RULES } from '../constants';
import { useFieldBinder } from '../hooks/useFieldBinder';
import { shipperFromProfile } from '../lib/shipper-profile';
import type { CreateOrderValues } from '../schema';
import styles from './form.module.css';

export function ShipperSection() {
  const bind = useFieldBinder();
  const { t, lang } = useI18n();
  const { setValue, getValues, control } = useFormContext<CreateOrderValues>();
  const shipper = useWatch({ control, name: 'shipper' });
  const address = shipper?.address ?? '';
  // Thu gọn / mở rộng: mặc định thu gọn khi đã đủ thông tin bắt buộc (thường là điền sẵn từ hồ sơ khách).
  const [open, setOpen] = useState<boolean | null>(null);
  const complete = (['company', 'contact', 'tel', 'address', 'country', 'branch'] as const).every(k => (shipper?.[k] ?? '').trim());
  const expanded = open ?? !complete;
  // Bấm Tạo đơn mà người gửi còn lỗi → tự mở ra để khách sửa.
  const { errors, submitCount } = useFormState({ control, name: 'shipper' });
  const hasErrors = !!errors.shipper;
  useEffect(() => {
    if (hasErrors) setOpen(true);
  }, [hasErrors, submitCount]);
  // Ô điện thoại: bỏ chữ cái / ký tự lạ ngay khi gõ hoặc dán.
  const keepPhone = (name: 'shipper.tel', value: string) => {
    const clean = sanitizePhone(value);
    if (clean !== value) setValue(name, clean, { shouldDirty: true });
  };

  // Điền sẵn từ hồ sơ khách; tên công ty và địa chỉ lấy hàng chỉ đọc.
  const session = useSession();
  const profile = session.data?.status === 'authenticated' ? session.data.user : null;
  useEffect(() => {
    if (!profile) return;
    const fill = shipperFromProfile(getValues('shipper'), profile);
    for (const [key, value] of Object.entries(fill) as Array<[keyof typeof fill, string]>) setValue(`shipper.${key}`, value);
  }, [profile, getValues, setValue]);

  return (
    <Card
      title="Thông tin người gửi"
      subtitle={lang === 'vi' ? '(Shipper)' : undefined}
      actions={
        <>
          <SelectField className={styles.shipperBranch} label="Chi nhánh gửi hàng" required options={BRANCHES} placeholder="Chọn chi nhánh" {...bind('shipper.branch')} />
          <Button size="sm" variant="ghost" aria-expanded={expanded} aria-controls="shipper-fields" onClick={() => setOpen(!expanded)}>
            {t(expanded ? 'Thu gọn' : 'Mở rộng')} <Icon name="chevronDown" size={14} className={cx(styles.chevron, expanded && styles.chevronOpen)} />
          </Button>
        </>
      }
    >
      {!expanded && (
        <button type="button" className={styles.collapsedSummary} onClick={() => setOpen(true)} title={t('Bấm để sửa thông tin người gửi')}>
          <span className={styles.summaryMain}>
            <strong>{shipper?.company}</strong>
            {shipper?.originalShipper?.trim() && <span> · {t('Shipper gốc')}: {shipper.originalShipper}</span>}
          </span>
          <span className={styles.summarySub}>
            {[shipper?.contact, shipper?.tel, shipper?.email].filter(v => v?.trim()).join(' · ')}
          </span>
          <span className={styles.summarySub}>
            {[shipper?.address, shipper?.branch && `${t('Chi nhánh')} ${shipper.branch}`].filter(Boolean).join(' · ')}
          </span>
          <span className={styles.summaryEdit}><Icon name="edit" size={14} /> {t('Sửa')}</span>
        </button>
      )}
      {/* Ô nhập luôn giữ trong form (chỉ ẩn) để giá trị và kiểm tra lỗi không bị mất khi thu gọn. */}
      <div id="shipper-fields" hidden={!expanded}>
      <FormGrid>
        <TextField label="Tên công ty / người gửi" required readOnly {...bind('shipper.company')} />
        <TextField
          label="Tên shipper gốc"
          hint="Dành cho đơn vị forwarder gửi hộ khách — không bắt buộc"
          maxLength={RULES.originalShipperMax}
          {...bind('shipper.originalShipper')}
        />
        <TextField label="Người liên hệ (contact name)" required {...bind('shipper.contact')} />
        <TextField label="Điện thoại (tel)" required type="tel" {...bind('shipper.tel', { onChange: e => keepPhone('shipper.tel', e.target.value) })} />
        <TextField
          label="Địa chỉ lấy hàng"
          required
          readOnly
          wide
          maxLength={RULES.shipperAddressMax}
          aside={`${address.length}/${RULES.shipperAddressMax}`}
          {...bind('shipper.address')}
        />
        <TextField label="Mã số thuế / CCCD / CMND" {...bind('shipper.taxId')} />
        <TextField label="Email" type="email" {...bind('shipper.email')} />
        <TextField label="Quốc gia gửi" required {...bind('shipper.country')} />
      </FormGrid>
      </div>

    </Card>
  );
}
