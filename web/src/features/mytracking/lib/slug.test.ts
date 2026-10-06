import { describe, expect, it } from 'vitest';
import { normalizeSlug, publicTrackingUrl, slugError } from './slug';

describe('normalizeSlug', () => {
  it('bỏ dấu, chữ thường, ký tự lạ thành gạch ngang', () => {
    expect(normalizeSlug('Việt An Đức')).toBe('viet-an-duc');
    expect(normalizeSlug('  SGB / Express ')).toBe('sgb-express-');
  });

  it('cắt tối đa 60 ký tự', () => {
    expect(normalizeSlug('a'.repeat(80))).toHaveLength(60);
  });
});

describe('slugError', () => {
  it('hợp lệ thì không báo lỗi', () => {
    expect(slugError('sgb-express')).toBeUndefined();
    expect(slugError('abc')).toBeUndefined();
  });

  it('quá ngắn, gạch ngang ở cuối hoặc 2 gạch liền nhau thì báo lỗi', () => {
    expect(slugError('ab')).toBeTruthy();
    expect(slugError('sgb-')).toBeTruthy();
    expect(slugError('sgb--hn')).toBeTruthy();
    expect(slugError('SGB')).toBeTruthy();
  });
});

describe('publicTrackingUrl', () => {
  it('ghép origin với /t/{slug}', () => {
    expect(publicTrackingUrl('sgb', 'https://portal.vietan.vn')).toBe('https://portal.vietan.vn/t/sgb');
  });
});
