import { z } from 'zod';

export const MAX_AD_IMAGES = 5;
export const MAX_IMAGE_BYTES = 200 * 1024;
export const COMPRESSED_IMAGE_BYTES = 200 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export function isWebUrl(value: string): boolean {
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}
export const isImageSource = (value: string): boolean =>
  isWebUrl(value) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
const imageSource = z.string().refine(isImageSource, 'Địa chỉ hình ảnh không hợp lệ');
const optionalImage = z.string().refine(v => !v || isImageSource(v), 'Địa chỉ hình ảnh không hợp lệ');
const optionalLink = z.string().trim().refine(v => !v || isWebUrl(v), 'Link phải bắt đầu bằng http:// hoặc https://');
export const myTrackingSchema = z.object({
  title: z.string().trim().min(1, 'Nhập tiêu đề MyTracking').max(120, 'Tiêu đề tối đa 120 ký tự'),
  description: z.string().trim().max(2000, 'Mô tả tối đa 2000 ký tự'),
  images: z.array(z.object({ id: z.string(), src: imageSource, linkUrl: optionalLink })).max(MAX_AD_IMAGES, 'Tối đa 5 ảnh quảng cáo'),
  background: optionalImage,
  brand: z.object({
    logo: optionalImage, companyName: z.string().trim().max(150), address: z.string().trim().max(500), phone: z.string().trim().max(50),
    facebook: optionalLink, instagram: optionalLink, x: optionalLink, zalo: optionalLink, whatsapp: optionalLink
  })
});
export type MyTrackingConfig = z.infer<typeof myTrackingSchema>;
export type AdImage = MyTrackingConfig['images'][number];
export const emptyConfig = (): MyTrackingConfig => ({
  title: 'DỊCH VỤ TIÊU BIỂU', description: '', images: [], background: '',
  brand: { logo: '', companyName: '', address: '', phone: '', facebook: '', instagram: '', x: '', zalo: '', whatsapp: '' }
});
/** Chuyển cấu hình thử nghiệm cũ sang cấu trúc mới, chỉ dùng dữ liệu đã kiểm tra. */
export function parseConfig(value: unknown): MyTrackingConfig {
  if (!value || typeof value !== 'object') return emptyConfig();
  const raw = value as Record<string, unknown>;
  const images = Array.isArray(raw.images) ? raw.images.map((image: unknown) => {
    if (!image || typeof image !== 'object') return image;
    const item = image as Record<string, unknown>;
    return { ...item, linkUrl: item.linkUrl ?? item.link ?? '' };
  }) : [];
  const parsed = myTrackingSchema.safeParse({ ...emptyConfig(), ...raw, images });
  return parsed.success ? parsed.data : emptyConfig();
}
