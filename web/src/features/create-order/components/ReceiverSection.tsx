import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ApiError } from '@/shared/api/http';
import { Button, Card, FormGrid, TextField, useToast } from '@/shared/ui';
import { useDebouncedCallback } from '@/shared/lib/useDebouncedCallback';
import { useCountries, usePostalLookup, useReceivers, useSaveReceiver } from '../api';
import { COUNTRIES, RULES } from '../constants';
import { useFieldBinder, type FieldName } from '../hooks/useFieldBinder';
import { canAutofill, findCountry, normalizePostal, shouldResetAddress } from '../lib/geo';
import type { CreateOrderValues } from '../schema';
import { AddressPickerDialog } from './AddressPickerDialog';
import styles from './form.module.css';

const MAX = RULES.receiverAddressMax;

export function ReceiverSection() {
  const bind = useFieldBinder();
  const toast = useToast();
  const { control, setValue, getValues, clearErrors } = useFormContext<CreateOrderValues>();
  const [addr1 = '', addr2 = '', addr3 = ''] = useWatch({ control, name: ['receiver.addr1', 'receiver.addr2', 'receiver.addr3'] });
  const [picking, setPicking] = useState(false);
  const receivers = useReceivers();
  const save = useSaveReceiver();

  // ---------- Nước đến → mã điện thoại ----------
  const countries = useCountries();
  const [countryText = '', postalText = ''] = useWatch({ control, name: ['receiver.country', 'receiver.postal'] });
  // API lỗi → dùng danh sách tĩnh (không có mã điện thoại) để vẫn nhận ra nước, tự xoá địa chỉ khi đổi nước.
  const countryList = useMemo(
    () => (countries.data?.length ? countries.data : COUNTRIES.map(name => ({ code: name, name }))),
    [countries.data]
  );
  const country = findCountry(countryList, countryText);
  const dialCode = country?.dialCode ?? '';
  useEffect(() => {
    if ((getValues('receiver.phoneCode') ?? '') !== dialCode) setValue('receiver.phoneCode', dialCode, { shouldDirty: true });
  }, [dialCode, getValues, setValue]);

  // ---------- Mã bưu chính → thành phố, tỉnh / bang (tra khi khách ngừng gõ) ----------
  const [postalQuery, setPostalQuery] = useState<string | null>(null);
  const schedulePostal = useDebouncedCallback((value: string | null) => setPostalQuery(value), 500);
  useEffect(() => schedulePostal(normalizePostal(postalText)), [postalText, schedulePostal]);
  const postal = usePostalLookup(country?.code, postalQuery);
  /** Giá trị hệ thống đã tự điền — khách tự sửa rồi thì không ghi đè. */
  const autofilled = useRef<{ city?: string; state?: string }>({});
  useEffect(() => {
    const info = postal.data;
    if (!info) return;
    const opts = { shouldDirty: true, shouldValidate: true } as const;
    if (canAutofill(getValues('receiver.city'), autofilled.current.city)) {
      setValue('receiver.city', info.city, opts);
      autofilled.current.city = info.city;
    }
    if (info.state && canAutofill(getValues('receiver.state'), autofilled.current.state)) {
      setValue('receiver.state', info.state, opts);
      autofilled.current.state = info.state;
    }
  }, [postal.data, getValues, setValue]);

  // ---------- Khách đổi sang nước khác → xoá mã bưu chính, thành phố, tỉnh / bang của nước cũ ----------
  /** Nước nhận ra gần nhất (cả khi điền bằng code: sổ địa chỉ, mở nháp) — chỉ để so sánh, không tự xoá. */
  const lastCountryCode = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (country) lastCountryCode.current = country.code;
  }, [country]);

  /** Chỉ chạy khi khách tự gõ / chọn ở ô Nước đến (sự kiện nhập), không chạy khi form được điền sẵn. */
  const onCountryInput = (e: { target: { value: string } }) => {
    const next = findCountry(countryList, e.target.value)?.code;
    if (shouldResetAddress(lastCountryCode.current, next)) {
      const opts = { shouldDirty: true } as const;
      setValue('receiver.postal', '', opts);
      setValue('receiver.city', '', opts);
      setValue('receiver.state', '', opts);
      clearErrors(['receiver.postal', 'receiver.city', 'receiver.state']);
      autofilled.current = {};
      setPostalQuery(null);
    }
    if (next) lastCountryCode.current = next;
  };

  const postalHint = !country || !postalQuery
    ? undefined
    : postal.isFetching
      ? 'Đang tra mã bưu chính…'
      : postal.data
        ? `→ ${[postal.data.city, postal.data.state].filter(Boolean).join(', ')}`
        : postal.data === null
          ? 'Không tìm thấy mã này — vui lòng tự nhập thành phố, tỉnh / bang'
          : undefined;

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
        <TextField label="Nước đến (country)" required list="va-countries" autoComplete="country-name" {...bind('receiver.country', { onChange: onCountryInput })} />
        <TextField label="Mã bưu chính (postal code)" hint={postalHint} autoComplete="postal-code" {...bind('receiver.postal')} />
        <TextField label="Thành phố (city)" required {...bind('receiver.city')} />
        <TextField label="Tỉnh / bang (state)" {...bind('receiver.state')} />
        <TextField label="Tên công ty (company name)" required wide {...bind('receiver.company')} />
        <TextField label="Người liên hệ (contact name)" required {...bind('receiver.contact')} />
        <TextField label="Điện thoại (tel)" required type="tel" prefix={dialCode || undefined} {...bind('receiver.tel')} />
        <TextField label="Tax ID" {...bind('receiver.taxId')} />
        <TextField label="Email" type="email" {...bind('receiver.email')} />
        {addressField('addr1', 'Địa chỉ 1 (address 1)', addr1, true)}
        {addressField('addr2', 'Địa chỉ 2 (address 2)', addr2, true)}
        {addressField('addr3', 'Địa chỉ 3 (address 3)', addr3, false)}
      </FormGrid>
      <datalist id="va-countries">
        {countryList.map(c => <option key={c.code} value={c.name} />)}
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
