/**
 * HTTP client dùng chung cho toàn bộ feature.
 * - Base URL: VITE_API_BASE_URL (mặc định /api/v1; dev được Vite proxy sang backend).
 * - Lỗi HTTP được chuẩn hóa thành ApiError để UI hiển thị thống nhất.
 * - Hợp đồng API từng endpoint: xem web/docs/API_CONTRACT.md.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Thông báo lỗi thân thiện để hiện toast. */
export const getErrorMessage = (e: unknown, fallback = 'Có lỗi xảy ra, vui lòng thử lại'): string =>
  e instanceof ApiError ? e.message : fallback;

/** Endpoint backend chưa làm (404/501) — UI hiện trạng thái "đang cập nhật" thay vì báo lỗi. */
export const isNotImplemented = (e: unknown): boolean => e instanceof ApiError && (e.status === 404 || e.status === 501);

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(BASE_URL + path, window.location.origin);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return url.pathname + url.search;
}

interface RequestOptions {
  params?: QueryParams;
  body?: unknown;
}

async function request<T>(method: string, path: string, { params, body }: RequestOptions = {}): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(buildUrl(path, params), {
    method,
    credentials: 'include',
    headers: body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body)
  });

  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (payload ?? {}) as { message?: string; error?: string };
    throw new ApiError(err.message ?? `Lỗi máy chủ (${res.status})`, res.status, err.error);
  }
  return payload as T;
}

/** Lỗi HTTP → ApiError (đọc message / error từ ProblemDetails của backend). */
async function toApiError(res: Response): Promise<ApiError> {
  const err = ((await res.json().catch(() => null)) ?? {}) as { message?: string; error?: string };
  return new ApiError(err.message ?? `Lỗi máy chủ (${res.status})`, res.status, err.error);
}

/** GET nội dung không phải JSON (trang in HTML, file Excel…). */
async function getRaw(path: string, params?: QueryParams): Promise<Response> {
  const res = await fetch(buildUrl(path, params), { credentials: 'include' });
  if (!res.ok) throw await toApiError(res);
  return res;
}

export const http = {
  get: <T>(path: string, params?: QueryParams) => request<T>('GET', path, { params }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
  /** Lấy văn bản (vd trang HTML để in). */
  getText: (path: string, params?: QueryParams) => getRaw(path, params).then(r => r.text()),
  /** Tải file kèm header Content-Disposition (để lấy tên file). */
  getFile: (path: string, params?: QueryParams) =>
    getRaw(path, params).then(async r => ({ blob: await r.blob(), disposition: r.headers.get('Content-Disposition') }))
};

/** Dạng phản hồi danh sách chuẩn của backend: { success, count, data }. */
export interface ListResponse<T> {
  data: T[];
  count?: number;
}
