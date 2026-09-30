import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useSession } from '@/features/auth';
import { BRANCHES } from '@/shared/config/domain';
import { useI18n } from '@/shared/i18n';
import { sanitizePhone } from '@/shared/lib/phone';
import { Button, Card, FormGrid, SelectField, TextField } from '@/shared/ui';
import { useSenders } from '../api';
import { RULES } from '../constants';
import { useFieldBinder } from '../hooks/useFieldBinder';
import { shipperFromProfile } from '../lib/shipper-profile';
import type { CreateOrderValues } from '../schema';
import { AddressPickerDialog } from './AddressPickerDialog';

export function ShipperSection() {
  const bind = useFieldBinder();
  const { t, lang } = useI18n();
  const { setValue, getValues, control } = useFormContext<CreateOrderValues>();
  const address = useWatch({ control, name: 'shipper.address' }) ?? '';
  const [picking, setPicking] = useState(false);
  const senders = useSenders();
  // Ô điện thoại: bỏ chữ cái / ký tự lạ ngay khi gõ hoặc dán.
  const keepPhone = (name: 'shipper.tel', value: string) => {
    const clean = sanitizePhone(value);
    if (clean !== value) setValue(name, clean, { shouldDirty: true });
  };

  // Điền sẵn người gửi theo hồ sơ khách đang đăng nhập (dbo.TCustomer) — chỉ điền ô còn trống, khách vẫn sửa được.
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
      actions={<Button size="sm" onClick={() => setPicking(true)}>{t('Đổi hồ sơ')}</Button>}
    >
      <FormGrid>
        <TextField label="Tên công ty / người gửi" required {...bind('shipper.company')} />
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
          wide
          maxLength={RULES.shipperAddressMax}
          aside={`${address.length}/${RULES.shipperAddressMax}`}
          {...bind('shipper.address')}
        />
        <TextField label="Mã số thuế / CCCD / CMND" {...bind('shipper.taxId')} />
        <TextField label="Email" type="email" {...bind('shipper.email')} />
        <TextField label="Quốc gia gửi" required {...bind('shipper.country')} />
        <SelectField label="Chi nhánh gửi hàng" required options={BRANCHES} placeholder="Chọn chi nhánh" {...bind('shipper.branch')} />
      </FormGrid>

      <AddressPickerDialog
        open={picking}
        title="Chọn hồ sơ người gửi"
        onClose={() => setPicking(false)}
        loading={senders.isLoading}
        items={(senders.data ?? []).map(s => ({
          key: s.id ?? s.n,
          title: s.n,
          subtitle: `${s.d} · ${s.c} · ${s.t}`,
          onPick: () => {
            const opts = { shouldDirty: true, shouldValidate: true } as const;
            setValue('shipper.company', s.n, opts);
            setValue('shipper.contact', s.c, opts);
            setValue('shipper.tel', s.t, opts);
            setValue('shipper.address', s.d, opts);
          }
        }))}
      />
    </Card>
  );
}
