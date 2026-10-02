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
/** Zalo / WhatsApp chấp nhận URL hoặc số điện thoại quốc tế. */
export function contactUrl(value: string, network: 'zalo' | 'whatsapp'): string {
  const text = value.trim();
  if (isWebUrl(text)) return text;
  if (!/^\+?[\d\s().-]{8,20}$/.test(text)) return '';
  let digits = text.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `84${digits.slice(1)}`;
  if (digits.length < 8 || digits.length > 15) return '';
  return network === 'zalo' ? `https://zalo.me/${digits}` : `https://wa.me/${digits}`;
}
const optionalContact = z.string().trim().refine(v => !v || !!contactUrl(v, 'zalo'), 'Nhập link http://, https:// hoặc số điện thoại hợp lệ');
export const myTrackingSchema = z.object({
  title: z.string().trim().min(1, 'Nhập tiêu đề MyTracking').max(120, 'Tiêu đề tối đa 120 ký tự'),
  description: z.string().trim().max(2000, 'Mô tả tối đa 2000 ký tự'),
  images: z.array(z.object({
    id: z.string(), src: imageSource, linkUrl: optionalLink,
    title: z.string().trim().max(120, 'Tiêu đề ảnh tối đa 120 ký tự').optional(),
    buttonText: z.string().trim().max(40, 'Chữ trên nút tối đa 40 ký tự').optional()
  })).max(MAX_AD_IMAGES, 'Tối đa 5 ảnh quảng cáo'),
  background: optionalImage,
  brand: z.object({
    logo: optionalImage, companyName: z.string().trim().max(150), address: z.string().trim().max(500), phone: z.string().trim().max(50),
    facebook: optionalLink, instagram: optionalLink, x: optionalLink, zalo: optionalContact, whatsapp: optionalContact
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
