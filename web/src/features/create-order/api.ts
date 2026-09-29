import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';

export interface Category {
  name: string;
  isFavorite: boolean;
  suggestions: Array<{ en: string; vi: string; hs: string }>;
}

/** Hồ sơ người gửi (backend SenderProfile). */
export interface SenderProfile {
  id?: string;
  n: string;
  c: string;
  t: string;
  d: string;
}

/** Mục sổ địa chỉ người nhận (backend ReceiverEntry). */
export interface ReceiverEntry {
  id?: string;
  n: string;
  ct: string;
  city: string;
  postal: string;
  contact: string;
  tel: string;
  a1: string;
  a2?: string;
  a3?: string;
}

const ONE_HOUR = 60 * 60 * 1000;

export function useCategories() {
  return useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: () => http.get<{ data: Category[] }>('/catalog/categories').then(r => r.data),
    staleTime: ONE_HOUR
  });
}

export function useSenders() {
  return useQuery({
    queryKey: ['addresses', 'senders'],
    queryFn: () => http.get<{ data: SenderProfile[] }>('/addresses/senders').then(r => r.data)
  });
}

export function useReceivers() {
  return useQuery({
    queryKey: ['addresses', 'receivers'],
    queryFn: () => http.get<{ data: ReceiverEntry[] }>('/addresses/receivers').then(r => r.data)
  });
}

export function useSaveReceiver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entry: ReceiverEntry) => http.post<{ message: string }>('/addresses/receivers', entry),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['addresses', 'receivers'] })
  });
}

/** Mặt hàng khách đã lưu để khai invoice nhanh (thư viện mặt hàng). */
export interface SavedProduct {
  id?: string;
  descEn: string;
  descVi: string;
  manufacturer: string;
  origin: string;
  hs: string;
  unit: string;
  price: string;
}

/** Invoice của các đơn gần đây — để chép lại khi gửi hàng lặp lại. */
export interface RecentInvoice {
  bill: string;
  cnee: string;
  date: string;
  currency: string;
  items: SavedProduct[];
}

/** Endpoint mới — xem API_CONTRACT.md. Chưa có thì UI báo "đang cập nhật". */
export function useProductLibrary(enabled: boolean) {
  return useQuery({
    queryKey: ['catalog', 'products'],
    queryFn: () => http.get<{ data: SavedProduct[] }>('/catalog/products').then(r => r.data),
    enabled,
    retry: false
  });
}

export function useSaveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: SavedProduct) => http.post<{ message: string }>('/catalog/products', p),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['catalog', 'products'] })
  });
}

export function useRecentInvoices(enabled: boolean) {
  return useQuery({
    queryKey: ['invoices', 'recent'],
    queryFn: () => http.get<{ data: RecentInvoice[] }>('/invoices/recent', { limit: 20 }).then(r => r.data),
    enabled,
    retry: false
  });
}
