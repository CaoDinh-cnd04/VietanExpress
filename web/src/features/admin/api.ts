import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiUrl, toError } from '@/shared/api/http';
import type { AdminFeedbackDetail, AdminFeedbackItem } from '@/features/feedback/types';

/**
 * Trang quản trị Việt An (/admin): token riêng giữ trong sessionStorage, gửi bằng header Authorization —
 * không dùng cookie phiên của khách (đăng nhập admin không đăng xuất tài khoản khách trên cùng trình duyệt).
 */
const TOKEN_KEY = 'va.admin.token';

export function getAdminToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setAdminToken(token: string | null) {
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage bị chặn: phải đăng nhập lại mỗi lần tải trang */
  }
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: { ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'omit'
  });
  if (res.status === 401) setAdminToken(null);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
    throw toError(res.status, body?.message, body?.error);
  }
  return res;
}

const adminKey = ['admin', 'feedback'] as const;

export function useAdminLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { userName: string; password: string }) => {
      const res = await adminFetch('/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = (await res.json()) as { data: { token: string } };
      setAdminToken(json.data.token);
      return json.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: adminKey })
  });
}

export function adminLogout() {
  setAdminToken(null);
}

export function useAdminFeedback(enabled: boolean) {
  return useQuery({
    queryKey: adminKey,
    queryFn: async () => ((await (await adminFetch('/admin/feedback')).json()) as { data: AdminFeedbackItem[] }).data,
    enabled,
    retry: (count, e) => !(e instanceof ApiError && e.status === 401) && count < 1
  });
}

/** Chi tiết 1 góp ý — mở là backend tự đánh dấu đã xem, nên cập nhật lại danh sách. */
export function useAdminFeedbackDetail(id: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['admin', 'feedback', 'detail', id],
    queryFn: async () => {
      const data = ((await (await adminFetch(`/admin/feedback/${encodeURIComponent(id!)}`)).json()) as { data: AdminFeedbackDetail }).data;
      void qc.invalidateQueries({ queryKey: adminKey, exact: true });
      return data;
    },
    enabled: !!id
  });
}

export function useMarkSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminFetch(`/admin/feedback/${encodeURIComponent(id)}/seen`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: adminKey })
  });
}

/** Ảnh góp ý cho trang quản trị: tải kèm token rồi tạo object URL (thẻ img không gửi được header). */
export function useAdminImage(id: string) {
  return useQuery({
    queryKey: ['admin', 'image', id],
    queryFn: async () => URL.createObjectURL(await (await adminFetch(`/account/feedback/images/${encodeURIComponent(id)}`)).blob()),
    staleTime: Infinity,
    gcTime: 10 * 60_000
  });
}
