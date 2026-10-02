import { describe, expect, it } from 'vitest';
import { emptyConfig, isWebUrl, MAX_IMAGE_BYTES, myTrackingSchema, parseConfig } from './schema';
import { validateImageFile } from './lib/images';
describe('MyTracking settings', () => {
  it('chặn link javascript cho quảng cáo và mạng xã hội', () => {
    expect(isWebUrl('https://example.com')).toBe(true);
    for (const url of ['javascript:alert(1)', 'file:///photo.jpg', 'data:text/html,test', 'invalid']) expect(isWebUrl(url)).toBe(false);
    expect(myTrackingSchema.safeParse({ ...emptyConfig(), images: [{ id: '1', src: 'https://example.com/photo.jpg', linkUrl: 'javascript:alert(1)' }] }).success).toBe(false);
    const config = emptyConfig(); config.brand.facebook = 'javascript:alert(1)';
    expect(myTrackingSchema.safeParse(config).success).toBe(false);
  });
  it('tối đa 5 ảnh, link đích có thể trống', () => {
    const image = { id: '1', src: 'https://example.com/photo.jpg', linkUrl: '' };
    expect(myTrackingSchema.safeParse({ ...emptyConfig(), images: Array.from({ length: 5 }, () => image) }).success).toBe(true);
    expect(myTrackingSchema.safeParse({ ...emptyConfig(), images: Array.from({ length: 6 }, () => image) }).success).toBe(false);
  });
  it('giữ cấu hình cũ và link quảng cáo, bổ sung thương hiệu trống', () => {
    const parsed = parseConfig({ title: 'Shop ABC', description: '', background: '', images: [{ id: '1', src: 'https://example.com/a.png', link: 'https://example.com' }] });
    expect(parsed.title).toBe('Shop ABC'); expect(parsed.images[0]?.linkUrl).toBe('https://example.com'); expect(parsed.brand.companyName).toBe('');
    expect(parseConfig({ title: 123 })).toEqual(emptyConfig());
  });
  it('chỉ nhận JPG/PNG/WebP tối đa 200 KB trước khi nén', () => {
    expect(() => validateImageFile({ type: 'image/jpeg', size: MAX_IMAGE_BYTES })).not.toThrow();
    expect(() => validateImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 })).toThrow('200 KB');
    expect(() => validateImageFile({ type: 'image/gif', size: 10 })).toThrow('Chỉ nhận ảnh');
    expect(() => validateImageFile({ type: 'image/svg+xml', size: 10 })).toThrow('Chỉ nhận ảnh');
  });
});
