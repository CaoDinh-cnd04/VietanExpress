import { useCallback, useEffect, useRef } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { CARRIER_HUBS, CARRIERS, defaultHub } from '@/shared/config/domain';
import { useDebouncedCallback } from '@/shared/lib/useDebouncedCallback';
import { useDrafts } from '@/features/drafts/api';
import { useOrder } from '@/features/orders/api';
import { defaultValues, type CreateOrderValues } from '../schema';

const STORAGE_KEY = 'va.createOrder.autosave';

/** Bản tự lưu trong phiên (sessionStorage) — giữ dữ liệu khi đổi chế độ Từng bước / 1 trang hoặc tải lại trang. */
export function readAutosave(): CreateOrderValues | undefined {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultValues(), ...(JSON.parse(raw) as Partial<CreateOrderValues>) } : undefined;
  } catch {
    return undefined;
  }
}

export function clearAutosave(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage bị chặn */
  }
}

const looksLikeForm = (v: unknown): v is CreateOrderValues =>
  !!v && typeof v === 'object' && 'shipper' in v && 'receiver' in v && 'shipment' in v;

/**
 * Nguồn dữ liệu ban đầu của form tạo đơn (ưu tiên theo thứ tự):
 * - ?draft=<id>   : mở lại đơn nháp để sửa (dùng payload đã lưu).
 * - ?from=<bill>  : nhân bản từ đơn đã tạo.
 * - ?carrier=&country= : chọn dịch vụ từ trang Giá & gợi ý.
 * - không có tham số: khôi phục bản tự lưu trong phiên.
 * Trả về id đơn nháp đang sửa (nếu có) để trang gọi cập nhật thay vì tạo mới.
 */
export function useOrderPrefill(form: UseFormReturn<CreateOrderValues>): { draftId: string | null; finishAutosave: () => void } {
  const [params] = useSearchParams();
  const draftId = params.get('draft');
  const fromBill = params.get('from');
  const carrier = params.get('carrier');
  const country = params.get('country');
  const drafts = useDrafts();
  const source = useOrder(fromBill);
  const applied = useRef<string | null>(null);

  // Mở đơn nháp
  useEffect(() => {
    if (!draftId || applied.current === `draft:${draftId}`) return;
    const draft = drafts.data?.find(d => d.id === draftId);
    if (!draft) return;
    applied.current = `draft:${draftId}`;
    if (looksLikeForm(draft.payload)) form.reset({ ...defaultValues(), ...draft.payload });
    else form.reset({ ...defaultValues(), receiver: { ...defaultValues().receiver, company: draft.cnee, country: draft.ct }, service: { ...defaultValues().service, reference: draft.ref } });
  }, [draftId, drafts.data, form]);

  // Nhân bản đơn: lấy thông tin người nhận / dịch vụ / hàng hóa; kiện & invoice khai lại
  useEffect(() => {
    const o = source.data;
    if (!fromBill || !o || applied.current === `from:${fromBill}`) return;
    applied.current = `from:${fromBill}`;
    const base = defaultValues();
    const route = String(o.route ?? '');
    const carrierName = CARRIERS.find(c => route.startsWith(c)) ?? base.service.carrier;
    const full = o as unknown as Partial<CreateOrderValues>;
    form.reset({
      ...base,
      receiver: { ...base.receiver, ...(full.receiver ?? {}), company: full.receiver?.company ?? o.cnee, country: full.receiver?.country ?? o.ct },
      service: { carrier: carrierName, hub: CARRIER_HUBS[carrierName]?.includes(route) ? route : defaultHub(carrierName), reference: '' },
      shipper: { ...base.shipper, ...(full.shipper ?? {}), branch: o.branch || base.shipper.branch },
      shipment: { ...base.shipment, type: o.type },
      goods: { ...base.goods, description: o.type === 'PACK' ? o.content : '', docContent: o.type === 'DOC' ? o.content : '' }
    });
  }, [fromBill, source.data, form]);

  // Chọn dịch vụ từ trang Giá
  useEffect(() => {
    if (!carrier || applied.current === `carrier:${carrier}`) return;
    applied.current = `carrier:${carrier}`;
    const name = CARRIERS.find(c => carrier.startsWith(c)) ?? carrier;
    // Hub tự được chọn theo hãng trong ServiceSection
    if (CARRIER_HUBS[name]) form.setValue('service.carrier', name, { shouldDirty: true });
    if (country) form.setValue('receiver.country', country);
  }, [carrier, country, form]);

  // Tự lưu trong phiên (chỉ khi tạo mới, không áp dụng khi đang sửa đơn nháp)
  const values = useWatch({ control: form.control });
  const stopped = useRef(false);
  const save = useDebouncedCallback((v: unknown) => {
    if (stopped.current) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    } catch {
      /* storage bị chặn */
    }
  }, 600);
  useEffect(() => {
    if (!draftId && !stopped.current && form.formState.isDirty) save(values);
  }, [values, draftId, form.formState.isDirty, save]);

  // Đã lưu đơn: dừng tự lưu rồi xoá bản tạm. Nếu không, lần tự lưu còn chờ có thể chạy SAU khi xoá
  // (trang kế tiếp tải chậm nên form cũ vẫn còn) và lần mở "Tạo đơn" sau bị điền sẵn đơn vừa tạo.
  const finishAutosave = useCallback(() => {
    stopped.current = true;
    save.cancel();
    clearAutosave();
  }, [save]);

  return { draftId, finishAutosave };
}
