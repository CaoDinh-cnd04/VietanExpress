import { useQuery } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import { parseConfig, type MyTrackingConfig } from './schema';

/** Trạng thái xuất bản trang MyTracking (/t/{slug}). */
export interface Publication {
  slug: string;
  published: boolean;
  updatedAt?: string | null;
}

/** GET / PUT /account/mytracking — `config` null khi khách chưa cấu hình. */
export interface MyTrackingResponse extends Publication {
  config: unknown;
}

export interface SaveMyTrackingRequest {
  slug: string;
  published: boolean;
  config: MyTrackingConfig;
}

/** Transport cho ApiConfigRepository — chỉ tài khoản chính (admin) gọi được. */
export const myTrackingApi = {
  load: () => http.get<{ data: MyTrackingResponse }>('/account/mytracking').then(r => r.data),
  save: (body: SaveMyTrackingRequest) => http.put<{ data: MyTrackingResponse }>('/account/mytracking', body).then(r => r.data)
};

/** Trang MyTracking đã xuất bản — GET /public/mytracking/:slug, không cần đăng nhập. 404 = chưa xuất bản / không có. */
export function usePublicMyTracking(slug: string) {
  return useQuery({
    queryKey: ['public-mytracking', slug],
    queryFn: () =>
      http.get<{ data: { slug: string; config: unknown } }>(`/public/mytracking/${encodeURIComponent(slug)}`)
        .then(r => ({ slug: r.data.slug, config: parseConfig(r.data.config) })),
    staleTime: 5 * 60_000,
    retry: false
  });
}
