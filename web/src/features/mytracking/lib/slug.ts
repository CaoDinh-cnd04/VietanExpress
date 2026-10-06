/** Đường dẫn trang MyTracking công khai /t/{slug} — đồng bộ với backend (MyTrackingPage.IsValidSlug). */
export const SLUG_MIN = 3;
export const SLUG_MAX = 60;
const SLUG_RULE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Gõ tự do → đường dẫn: bỏ dấu tiếng Việt, chữ thường, ký tự khác chữ / số thành "-". */
export function normalizeSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, SLUG_MAX);
}

/** Thông báo lỗi, hoặc undefined nếu hợp lệ. */
export function slugError(slug: string): string | undefined {
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) return 'Đường dẫn từ 3 đến 60 ký tự';
  if (!SLUG_RULE.test(slug)) return 'Chỉ gồm chữ thường không dấu, số và dấu gạch ngang (không đứng đầu / cuối)';
  return undefined;
}

/** Link đầy đủ để gửi cho người nhận hàng. */
export const publicTrackingUrl = (slug: string, origin: string): string => `${origin}/t/${slug}`;
