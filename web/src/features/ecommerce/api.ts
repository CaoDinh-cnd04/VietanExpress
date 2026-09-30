import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage, http, type ListResponse } from '@/shared/api/http';
import { fill } from '@/shared/i18n';
import { useToast } from '@/shared/ui';
import type { CsvImportResult, EcomOrder, EcomSettings, EcomSource, NewManualEcomOrder } from './types';

export const ecomKeys = {
  orders: (src: EcomSource | 'all', q: string) => ['ecom', 'orders', src, q] as const,
  allOrders: ['ecom', 'orders'] as const,
  settings: ['ecom', 'settings'] as const
};

export function useEcomOrders(src: EcomSource | 'all' = 'all', q = '') {
  return useQuery({
    queryKey: ecomKeys.orders(src, q),
    queryFn: () => http.get<ListResponse<EcomOrder>>('/ecom/orders', { src: src === 'all' ? undefined : src, q }).then(r => r.data),
    placeholderData: keepPreviousData
  });
}

export function useCreateManualEcomOrder() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (body: NewManualEcomOrder) => http.post<{ message: string; data: EcomOrder }>('/ecom/manual', body),
    onSuccess: res => {
      toast.show(res.data.bill ? fill('{message} — mã bill {bill}', { message: res.message, bill: res.data.bill }) : res.message, 'success');
      void qc.invalidateQueries({ queryKey: ecomKeys.allOrders });
    },
    onError: e => toast.show(getErrorMessage(e), 'error')
  });
}

/** Gửi nội dung CSV (mẫu 70 cột). Backend trả số đơn thành công + lỗi từng dòng. */
export function useImportEcomCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (csv: string) => http.post<CsvImportResult>('/ecom/import-csv', { csv }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ecomKeys.allOrders })
  });
}

/** In nhãn hàng loạt. Endpoint mới — xem API_CONTRACT.md. */
export function usePrintEcomLabels() {
  const toast = useToast();
  return useMutation({
    mutationFn: (body: { ids: string[]; format: string }) => http.post<{ message: string; url?: string }>('/ecom/labels', body),
    onSuccess: res => {
      if (res.url) window.open(res.url, '_blank', 'noopener');
      toast.show(res.message, 'success');
    },
    onError: e => toast.show(getErrorMessage(e, 'Chưa in được nhãn — chức năng đang được kết nối máy chủ'), 'error')
  });
}

export function useEcomSettings() {
  return useQuery({
    queryKey: ecomKeys.settings,
    queryFn: () => http.get<{ data: EcomSettings }>('/ecom/settings').then(r => r.data),
    retry: false
  });
}

export function useSaveEcomSettings() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (body: Partial<EcomSettings>) => http.put<{ message: string; data: EcomSettings }>('/ecom/settings', body),
    onSuccess: res => {
      toast.show(res.message, 'success');
      qc.setQueryData(ecomKeys.settings, res.data);
    },
    onError: e => toast.show(getErrorMessage(e), 'error')
  });
}

export function useRegenerateApiKey() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (env: 'production' | 'sandbox') => http.post<{ message: string; data: EcomSettings }>('/ecom/settings/api-keys/regenerate', { env }),
    onSuccess: res => {
      toast.show(res.message, 'success');
      qc.setQueryData(ecomKeys.settings, res.data);
    },
    onError: e => toast.show(getErrorMessage(e), 'error')
  });
}

export function useTestWebhook() {
  const toast = useToast();
  return useMutation({
    mutationFn: () => http.post<{ message: string }>('/ecom/settings/webhook/test'),
    onSuccess: res => toast.show(res.message, 'success'),
    onError: e => toast.show(getErrorMessage(e), 'error')
  });
}
