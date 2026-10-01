import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiError, http } from '@/shared/api/http';
import type { Country, PostalInfo } from './lib/geo';

/** Nhóm hàng hóa (dbo.NhomHangHoa). */
export interface Category {
  id: string;
  name: string;
  isFavorite: boolean;
  /** Nhóm khách tự tạo — sửa / xóa được; false = nhóm chung Việt An. */
  isOwn: boolean;
  suggestions: Array<{ en: string; vi: string; hs: string }>;
}

export interface CategoryInput {
  name: string;
  isFavorite: boolean;
}

const CATEGORIES_KEY = ['catalog', 'categories'] as const;

/** Đổi sao trong cache ngay khi bấm; trả dữ liệu cũ để hoàn lại nếu máy chủ báo lỗi. */
async function toggleCached<T extends { id?: string; isFavorite?: boolean }>(qc: QueryClient, key: readonly string[], id: string, isFavorite: boolean) {
  await qc.cancelQueries({ queryKey: key });
  const previous = qc.getQueryData<T[]>(key);
  qc.setQueryData<T[]>(key, list => list?.map(x => (x.id === id ? { ...x, isFavorite } : x)));
  return previous;
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
    queryKey: CATEGORIES_KEY,
    queryFn: () => http.get<{ data: Category[] }>('/catalog/categories').then(r => r.data),
    staleTime: ONE_HOUR
  });
}

/** Thêm (không có id) hoặc sửa nhóm hàng của khách. */
export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: CategoryInput & { id?: string }) =>
      id
        ? http.put<{ data: Category; message: string }>(`/catalog/categories/${encodeURIComponent(id)}`, body)
        : http.post<{ data: Category; message: string }>('/catalog/categories', body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: CATEGORIES_KEY })
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => http.delete<{ message: string }>(`/catalog/categories/${encodeURIComponent(id)}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: CATEGORIES_KEY })
  });
}

/** Đánh dấu / bỏ yêu thích nhóm hàng — được cả nhóm chung Việt An (backend lưu riêng cho từng khách). */
export function useFavoriteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      http.put<{ message: string }>(`/catalog/categories/${encodeURIComponent(id)}/favorite`, { isFavorite }),
    // Sao đổi ngay trên giao diện, lỗi thì trả lại như cũ
    onMutate: ({ id, isFavorite }) => toggleCached<Category>(qc, CATEGORIES_KEY, id, isFavorite),
    onError: (_e, _v, previous) => qc.setQueryData(CATEGORIES_KEY, previous),
    onSettled: () => void qc.invalidateQueries({ queryKey: CATEGORIES_KEY })
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
  /** Khóa mặt hàng trong thư viện (dùng để đánh dấu yêu thích / xóa). */
  id?: string;
  /** Mặt hàng khách đánh dấu sao — đứng đầu thư viện. */
  isFavorite?: boolean;
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

/** Biểu phí 1 tùy chọn dịch vụ — `name` khớp ADDONS.name (giá trị lưu trong đơn). */
export interface AddonFee {
  name: string;
  /** Phí; null = chưa có giá / liên hệ CS. */
  fee: number | null;
  currency: string;
  /** Cách tính, vd "đơn", "kiện", "% giá trị hàng". */
  unit: string;
  /** Ghi chú (mức tối thiểu, điều kiện…). */
  note?: string | null;
}

/** Biểu phí tùy chọn dịch vụ — GET /catalog/addon-fees. Endpoint mới (API_CONTRACT §3); chưa có thì UI báo "đang cập nhật". */
export function useAddonFees(enabled: boolean) {
  return useQuery({
    queryKey: ['catalog', 'addon-fees'],
    queryFn: () => http.get<{ data: AddonFee[] }>('/catalog/addon-fees').then(r => r.data),
    enabled,
    staleTime: ONE_HOUR,
    retry: false
  });
}

const PRODUCTS_KEY = ['catalog', 'products'] as const;

/** Thư viện mặt hàng: yêu thích đứng đầu, mặt hàng đã xóa không trả về. */
export function useProductLibrary(enabled: boolean) {
  return useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn: () => http.get<{ data: SavedProduct[] }>('/catalog/products').then(r => r.data),
    enabled,
    retry: false
  });
}

/** Đánh dấu / bỏ yêu thích mặt hàng trong thư viện. */
export function useFavoriteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      http.put<{ message: string }>(`/catalog/products/${encodeURIComponent(id)}/favorite`, { isFavorite }),
    onMutate: ({ id, isFavorite }) => toggleCached<SavedProduct>(qc, PRODUCTS_KEY, id, isFavorite),
    onError: (_e, _v, previous) => qc.setQueryData(PRODUCTS_KEY, previous),
    onSettled: () => void qc.invalidateQueries({ queryKey: PRODUCTS_KEY })
  });
}

/** Xóa mặt hàng khỏi thư viện (chỉ ẩn — đơn cũ giữ nguyên). */
export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => http.delete<{ message: string }>(`/catalog/products/${encodeURIComponent(id)}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PRODUCTS_KEY })
  });
}

export function useSaveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: SavedProduct) => http.post<{ message: string }>('/catalog/products', p),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PRODUCTS_KEY })
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

const ONE_DAY = 24 * ONE_HOUR;

/** Danh sách quốc gia + mã điện thoại (backend lấy từ bộ dữ liệu world-countries, có cache). */
export function useCountries() {
  return useQuery({
    queryKey: ['geo', 'countries'],
    queryFn: () => http.get<{ data: Country[] }>('/geo/countries').then(r => r.data),
    staleTime: ONE_DAY,
    gcTime: ONE_DAY,
    retry: 1
  });
}

/** Tra mã bưu chính → thành phố, tỉnh / bang qua backend (backend gọi GeoNames; frontend không giữ tài khoản GeoNames). Không tìm thấy trả null. */
export function usePostalLookup(countryCode: string | undefined, postal: string | null) {
  return useQuery({
    queryKey: ['geo', 'postal', countryCode, postal],
    queryFn: () =>
      http
        .get<{ data: PostalInfo }>(`/geo/postal/${encodeURIComponent(countryCode ?? '')}/${encodeURIComponent(postal ?? '')}`)
        .then(r => r.data)
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 404) return null;
          throw e;
        }),
    enabled: !!countryCode && !!postal,
    staleTime: ONE_DAY,
    retry: false
  });
}
