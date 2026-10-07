import { describe, expect, it } from 'vitest';
import { stripDiacritics } from './text';

describe('stripDiacritics', () => {
  it('bỏ dấu tiếng Việt, giữ chữ hoa / thường', () => {
    expect(stripDiacritics('Đức Anh Việt Nam')).toBe('Duc Anh Viet Nam');
    expect(stripDiacritics('đường Trường Chinh')).toBe('duong Truong Chinh');
    expect(stripDiacritics('ABC 123')).toBe('ABC 123');
  });
});
