import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ApiError } from '@/shared/api/http';
import { Button, Card, FormGrid, TextField, useToast } from '@/shared/ui';
import { useReceivers, useSaveReceiver } from '../api';
import { COUNTRIES, RULES } from '../constants';
import { useFieldBinder, type FieldName } from '../hooks/useFieldBinder';
import type { CreateOrderValues } from '../schema';
import { AddressPickerDialog } from './AddressPickerDialog';
import styles from './form.module.css';

const MAX = RULES.receiverAddressMax;

export function ReceiverSection() {
  const bind = useFieldBinder();
  const toast = useToast();
  const { control, setValue, getValues } = useFormContext<CreateOrderValues>();
  const [addr1 = '', addr2 = '', addr3 = ''] = useWatch({ control, name: ['receiver.addr1', 'receiver.addr2', 'receiver.addr3'] });
  const [picking, setPicking] = useState(false);
  const receivers = useReceivers();
  const save = useSaveReceiver();

  const fill = (entries: Array<[FieldName, string]>) =>
    entries.forEach(([name, value]) => setValue(name, value, { shouldDirty: true, shouldValidate: true }));

  const saveToBook = () => {
    const r = getValues('receiver');
    save.mutate(
      { n: r.company, ct: r.country, city: r.city, postal: r.postal, contact: r.contact, tel: r.tel, a1: r.addr1, a2: r.addr2, a3: r.addr3 },
      {
        onSuccess: res => toast.show(res.message, 'success'),
        onError: e => toast.show(e instanceof ApiError ? e.message : 'Không lưu được địa chỉ', 'error')
      }
    );
  };

  const addressField = (name: 'addr1' | 'addr2' | 'addr3', label: string, value: string, required: boolean) => (
    <TextField label={label} required={required} wide maxLength={MAX} aside={`${value.length}/${MAX}`} {...bind(`receiver.${name}`)} />
  );

  return (
    <Card
      title="Thông tin người nhận"
      subtitle="(Receiver)"
      className={styles.fill}
      actions={<Button size="sm" onClick={() => setPicking(true)}>Sổ địa chỉ</Button>}
    >
      <FormGrid>
        <TextField label="Nước đến (country)" required list="va-countries" autoComplete="country-name" {...bind('receiver.country')} />
        <TextField label="Thành phố (city)" required {...bind('receiver.city')} />
        <TextField label="Tên công ty (company name)" required wide {...bind('receiver.company')} />
        <TextField label="Người liên hệ (contact name)" required {...bind('receiver.contact')} />
        <TextField label="Điện thoại (tel)" required type="tel" {...bind('receiver.tel')} />
        <TextField label="Tax ID" {...bind('receiver.taxId')} />
        <TextField label="Email" type="email" {...bind('receiver.email')} />
        <TextField label="Mã bưu chính (postal code)" {...bind('receiver.postal')} />
        <TextField label="Tỉnh / bang (state)" {...bind('receiver.state')} />
        {addressField('addr1', 'Địa chỉ 1 (address 1)', addr1, true)}
        {addressField('addr2', 'Địa chỉ 2 (address 2)', addr2, true)}
        {addressField('addr3', 'Địa chỉ 3 (address 3)', addr3, false)}
      </FormGrid>
      <datalist id="va-countries">
        {COUNTRIES.map(c => <option key={c} value={c} />)}
      </datalist>

      <p className={styles.warning}>Hệ thống kiểm tra VSVX chỉ mang tính chất tham khảo. Vui lòng tự kiểm tra VSVX với hãng trước khi gửi hàng.</p>
      <div className={styles.inlineActions}>
        <Button size="sm" onClick={saveToBook} disabled={save.isPending}>Lưu vào sổ địa chỉ</Button>
        <span className={styles.hint}>Lưu để lần sau chọn nhanh.</span>
      </div>

      <AddressPickerDialog
        open={picking}
        title="Sổ địa chỉ người nhận"
        onClose={() => setPicking(false)}
        loading={receivers.isLoading}
        items={(receivers.data ?? []).map(r => ({
          key: r.id ?? r.n,
          title: r.n,
          subtitle: `${r.ct} · ${r.contact} · ${r.tel}`,
          onPick: () =>
            fill([
              ['receiver.company', r.n],
              ['receiver.country', r.ct],
              ['receiver.city', r.city],
              ['receiver.postal', r.postal],
              ['receiver.contact', r.contact],
              ['receiver.tel', r.tel],
              ['receiver.addr1', r.a1],
              ['receiver.addr2', r.a2 ?? ''],
              ['receiver.addr3', r.a3 ?? '']
            ])
        }))}
      />
    </Card>
  );
}
