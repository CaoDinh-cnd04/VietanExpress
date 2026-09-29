import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage, http, type ListResponse } from '@/shared/api/http';
import { useToast } from '@/shared/ui';
import type { QuoteRequest, ServiceQuote, ShippingService } from './types';

export const pricingKeys = { services: ['pricing', 'services'] as const };

/** Tra cứu & so sánh giá các dịch vụ cho 1 lô hàng. */
export function useQuote() {
  return useMutation({
    mutationFn: (req: QuoteRequest) => http.post<{ rates: ServiceQuote[] }>('/rates', req).then(r => r.rates)
  });
}

export function useServices() {
  return useQuery({
    queryKey: pricingKeys.services,
    queryFn: () => http.get<ListResponse<ShippingService>>('/services').then(r => r.data)
  });
}

/** Lưu (tạo mới hoặc cập nhật theo id) bảng giá một dịch vụ. */
export function useSaveService() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (svc: ShippingService) => http.post<{ message: string }>('/services', svc),
    onSuccess: res => {
      toast.show(res.message, 'success');
      void qc.invalidateQueries({ queryKey: pricingKeys.services });
    },
    onError: e => toast.show(getErrorMessage(e), 'error')
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => http.delete<{ message: string }>(`/services/${encodeURIComponent(id)}`),
    onSuccess: res => {
      toast.show(res.message, 'success');
      void qc.invalidateQueries({ queryKey: pricingKeys.services });
    },
    onError: e => toast.show(getErrorMessage(e), 'error')
  });
}
