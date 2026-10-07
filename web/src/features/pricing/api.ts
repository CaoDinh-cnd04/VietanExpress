import { useMutation, useQuery } from '@tanstack/react-query';
import { http, type ListResponse } from '@/shared/api/http';
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

