import { useMutation, useQuery } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import type { ContactRequest } from './schema';
import type { TrackResult } from './types';

/**
 * Tra cứu vận đơn công khai (không cần đăng nhập) — POST /public/tracking, xem API_CONTRACT.md.
 * Chạy khi có mã; cùng danh sách mã thì dùng lại kết quả trong 1 phút.
 */
export function useTracking(bills: readonly string[]) {
  return useQuery({
    queryKey: ['public-tracking', ...bills],
    queryFn: () => http.post<{ data: TrackResult[] }>('/public/tracking', { bills }).then(r => r.data),
    enabled: bills.length > 0,
    staleTime: 60_000,
    retry: false
  });
}

/** Khách vãng lai gửi yêu cầu tư vấn — POST /public/contact. */
export function useSendContact() {
  return useMutation({
    mutationFn: (body: ContactRequest) => http.post<{ message?: string }>('/public/contact', body)
  });
}
