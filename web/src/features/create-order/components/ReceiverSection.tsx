import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ApiError } from '@/shared/api/http';
import { Button, Card, FormGrid, TextField, useToast, type TextFieldProps } from '@/shared/ui';
import { useI18n } from '@/shared/i18n';
import { useDebouncedCallback } from '@/shared/lib/useDebouncedCallback';
import { sanitizePhone } from '@/shared/lib/phone';
import { euCountryCode, isEuCountry } from '@/shared/config/eu';
import { useAddressSuggestions, useCountries, usePostalLookup, useRecentReceivers, useReceivers, useSaveReceiver } from '../api';
import { COUNTRIES, RULES } from '../constants';
import { useCombobox } from '../hooks/useCombobox';
import { useFieldBinder, type FieldName } from '../hooks/useFieldBinder';
import { splitAddressLines } from '../lib/address';
import { receiverFields, recentReceiverQuery, recentReceiverSubtitle, type RecentReceiver } from '../lib/recent-receivers';
import { addressQuery, findCountry, normalizePostal, shouldResetAddress, suggestionFields, type AddressSuggestion } from '../lib/geo';
import type { CreateOrderValues } from '../schema';
import { AddressPickerDialog } from './AddressPickerDialog';
import { SuggestionList } from './SuggestionList';
import styles from './form.module.css';

const MAX = RULES.receiverAddressMax;

/** Thêm vào ô địa chỉ: xử lý gõ / rời ô và thuộc tính của ô nhập (combobox gợi ý ở Địa chỉ 1). */
interface AddressFieldExtra {
  onChange?: () => void;
  onBlur?: () => void;
  input?: Partial<TextFieldProps>;
}

export function ReceiverSection() {
  const bind = useFieldBinder();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { control, setValue, getValues, clearErrors, setFocus, trigger } = useFormContext<CreateOrderValues>();
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
  const countryCode = country?.code.length === 2 ? country.code : euCountryCode(countryText);
  const showEuTaxFields = isEuCountry(countryCode);
  useEffect(() => {
    setValue('receiver.countryCode', countryCode ?? '', { shouldDirty: true });
    if (!isEuCountry(countryCode)) {
      setValue('receiver.iossNo', '', { shouldDirty: true });
      setValue('receiver.eoriNo', '', { shouldDirty: true });
      clearErrors(['receiver.iossNo', 'receiver.eoriNo']);
    }
  }, [countryCode, setValue, clearErrors]);
  const dialCode = country?.dialCode ?? '';
  useEffect(() => {
    if ((getValues('receiver.phoneCode') ?? '') !== dialCode) setValue('receiver.phoneCode', dialCode, { shouldDirty: true });
  }, [dialCode, getValues, setValue]);

  // ---------- Mã bưu chính → thành phố, tỉnh / bang (tra khi khách ngừng gõ) ----------
  const [postalQuery, setPostalQuery] = useState<string | null>(null);
  const schedulePostal = useDebouncedCallback((value: string | null) => setPostalQuery(value), 500);
  useEffect(() => schedulePostal(normalizePostal(postalText)), [postalText, schedulePostal]);
  const postal = usePostalLookup(country?.code, postalQuery);
  /** Mã bưu chính vừa điền từ gợi ý địa chỉ — gợi ý đã có thành phố / tỉnh đúng, không để kết quả tra mã ghi đè. */
  const pickedPostal = useRef<string | null>(null);
  // Kết quả postal code được ưu tiên hơn địa chỉ đã nhập trước đó.
  useEffect(() => {
    const info = postal.data;
    // Khách đang đổi mã / nước: không điền kết quả của lần tra cũ trong lúc debounce.
    if (!info || info.countryCode !== country?.code || info.postalCode !== normalizePostal(postalText)) return;
    if (pickedPostal.current === info.postalCode) return;
    const opts = { shouldDirty: true, shouldValidate: true } as const;
    setValue('receiver.city', info.city, opts);
    setValue('receiver.state', info.state ?? '', opts);
  }, [postal.data, country?.code, postalText, setValue]);

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

  // Địa chỉ 1 / 2 quá giới hạn ký tự → tự cắt ở khoảng trắng gần nhất, phần thừa dồn xuống dòng sau (như Bill Online cũ)
  const ADDR = ['addr1', 'addr2', 'addr3'] as const;
  const onAddressInput = (name: (typeof ADDR)[number]) => {
    const current = ADDR.map(k => getValues(`receiver.${k}`) ?? '');
    const { lines, overflowFrom } = splitAddressLines(current, MAX);
    if (overflowFrom === null) return;
    lines.forEach((line, i) => line !== current[i] && setValue(`receiver.${ADDR[i]!}`, line, { shouldDirty: true, shouldValidate: true }));
    // Đang gõ ở dòng bị tràn → chuyển con trỏ xuống cuối phần vừa dồn sang dòng sau
    const from = ADDR.indexOf(name);
    if (from === overflowFrom && from < ADDR.length - 1) {
      const next = ADDR[from + 1]!;
      const moved = lines[from + 1]!.length - (current[from + 1] ?? '').trim().length - ((current[from + 1] ?? '').trim() ? 1 : 0);
      setFocus(`receiver.${next}`);
      requestAnimationFrame(() => {
        const el = document.activeElement as HTMLInputElement | null;
        el?.setSelectionRange?.(moved, moved);
      });
    }
  };
  const addressField = (name: (typeof ADDR)[number], label: string, value: string, required: boolean, extra?: AddressFieldExtra) => (
    <TextField
      label={label}
      required={required}
      wide
      maxLength={name === 'addr3' ? MAX : undefined}
      aside={`${value.length}/${MAX}`}
      {...extra?.input}
      {...bind(`receiver.${name}`, { onChange: () => { onAddressInput(name); extra?.onChange?.(); }, onBlur: extra?.onBlur })}
    />
  );

  // ---------- Gợi ý địa chỉ (Geoapify) khi khách gõ Địa chỉ 1 → điền địa chỉ, thành phố, tỉnh / bang, mã bưu chính ----------
  const [addrQuery, setAddrQuery] = useState<string | null>(null);
  const scheduleAddr = useDebouncedCallback((value: string | null) => setAddrQuery(value), 350);
  const addressSuggestions = useAddressSuggestions(countryCode, addrQuery);
  const addrBox = useCombobox(addrQuery ? addressSuggestions.data ?? [] : [], (s: AddressSuggestion) => {
    scheduleAddr.cancel();
    const opts = { shouldDirty: true, shouldValidate: true } as const;
    suggestionFields(s).forEach(([field, value]) => setValue(`receiver.${field}`, value, opts));
    pickedPostal.current = normalizePostal(s.postalCode ?? '');
    setAddrQuery(null);
  });
  const addr1Extra: AddressFieldExtra = {
    onChange: () => {
      scheduleAddr(addressQuery(getValues('receiver.addr1')));
      addrBox.onType();
    },
    onBlur: addrBox.close,
    input: addrBox.inputProps
  };

  // ---------- Gõ tên công ty → người nhận đã gửi trước đây (đơn cũ của khách) → điền lại toàn bộ thông tin người nhận ----------
  const [companyQuery, setCompanyQuery] = useState<string | null>(null);
  const scheduleCompany = useDebouncedCallback((value: string | null) => setCompanyQuery(value), 250);
  const recentReceivers = useRecentReceivers(companyQuery);
  const companyBox = useCombobox(companyQuery ? recentReceivers.data ?? [] : [], (r: RecentReceiver) => {
    scheduleCompany.cancel();
    setCompanyQuery(null);
    const opts = { shouldDirty: true, shouldValidate: true } as const;
    receiverFields(r).forEach(([field, value]) => setValue(`receiver.${field}`, value, opts));
    // Nước đổi theo người nhận đã chọn: thành phố / mã bưu chính lấy từ đơn cũ, không để tra mã ghi đè.
    lastCountryCode.current = findCountry(countryList, r.country ?? '')?.code ?? lastCountryCode.current;
    pickedPostal.current = normalizePostal(r.postalCode ?? '');
  });

  return (
    <Card
      title="Thông tin người nhận"
      subtitle={lang === 'vi' ? '(Receiver)' : undefined}
      className={styles.fill}
      actions={<Button size="sm" onClick={() => setPicking(true)}>{t('Sổ địa chỉ')}</Button>}
    >
      <FormGrid>
        <TextField label="Nước đến (country)" required list="va-countries" autoComplete="country-name" {...bind('receiver.country', { onChange: onCountryInput })} />
        <TextField label="Mã bưu chính (postal code)" hint={postalHint} autoComplete="postal-code" {...bind('receiver.postal')} />
        <TextField label="Thành phố (city)" required {...bind('receiver.city')} />
        <TextField label="Tỉnh / bang (state)" {...bind('receiver.state')} />
        <div className={styles.suggestWrap}>
          <TextField
            label="Tên công ty (company name)"
            required
            wide
            {...companyBox.inputProps}
            {...bind('receiver.company', {
              onChange: () => {
                scheduleCompany(recentReceiverQuery(getValues('receiver.company')));
                companyBox.onType();
              },
              onBlur: companyBox.close
            })}
          />
          {companyBox.visible.length > 0 && (
            <SuggestionList
              id={companyBox.listId}
              label="Người nhận đã gửi"
              items={companyBox.visible.map((r, i) => ({ key: `${i}-${r.company}`, title: r.company, subtitle: recentReceiverSubtitle(r) }))}
              active={companyBox.active}
              onPick={companyBox.pick}
            />
          )}
        </div>
        <TextField label="Người liên hệ (contact name)" required {...bind('receiver.contact')} />
        <TextField label="Điện thoại (tel)" required type="tel" prefix={dialCode || undefined} {...bind('receiver.tel', { onChange: e => { const clean = sanitizePhone(e.target.value); if (clean !== e.target.value) setValue('receiver.tel', clean, { shouldDirty: true }); } })} />
        <TextField label="Tax ID" {...bind('receiver.taxId')} />
        <TextField label="Email" type="email" {...bind('receiver.email')} />
        {showEuTaxFields && (
          <>
            <TextField label="IOSS No" placeholder="IM1234567890" {...bind('receiver.iossNo', { onBlur: () => void trigger('receiver.iossNo') })} />
            <TextField label="EORI No" placeholder="DE123456789012345" {...bind('receiver.eoriNo', { onBlur: () => void trigger('receiver.eoriNo') })} />
          </>
        )}
        <div className={styles.suggestWrap}>
          {addressField('addr1', 'Địa chỉ 1 (address 1)', addr1, true, addr1Extra)}
          {addrBox.visible.length > 0 && (
            <SuggestionList
              id={addrBox.listId}
              label="Gợi ý địa chỉ"
              items={addrBox.visible.map(s => ({ key: s.label, title: s.label }))}
              active={addrBox.active}
              onPick={addrBox.pick}
              footer="Powered by Geoapify · © OpenStreetMap contributors"
            />
          )}
        </div>
        {addressField('addr2', 'Địa chỉ 2 (address 2)', addr2, true)}
        {addressField('addr3', 'Địa chỉ 3 (address 3)', addr3, false)}
      </FormGrid>
      <datalist id="va-countries">
        {countryList.map(c => <option key={c.code} value={c.name} />)}
      </datalist>

      <p className={styles.warning}>{t('Hệ thống kiểm tra VSVX chỉ mang tính chất tham khảo. Vui lòng tự kiểm tra VSVX với hãng trước khi gửi hàng.')}</p>
      <div className={styles.inlineActions}>
        <Button size="sm" onClick={saveToBook} disabled={save.isPending}>{t('Lưu vào sổ địa chỉ')}</Button>
        <span className={styles.hint}>{t('Lưu để lần sau chọn nhanh.')}</span>
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
