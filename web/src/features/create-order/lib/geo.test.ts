import { describe, expect, it } from 'vitest';
import { canAutofill, findCountry, normalizePostal, type Country } from './geo';

const countries: Country[] = [
  { code: 'US', name: 'United States', dialCode: '+1' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44' }
];

describe('findCountry', () => {
  it('khớp tên không phân biệt hoa thường, bỏ khoảng trắng thừa', () => {
    expect(findCountry(countries, 'united  states ')?.dialCode).toBe('+1');
    expect(findCountry(countries, 'VIETNAM')?.code).toBe('VN');
  });
  it('gõ mã ISO 2 ký tự', () => {
    expect(findCountry(countries, 'gb')?.name).toBe('United Kingdom');
  });
  it('không khớp hoặc trống', () => {
    expect(findCountry(countries, 'United')).toBeUndefined();
    expect(findCountry(countries, '')).toBeUndefined();
  });
});

describe('normalizePostal', () => {
  it('chuẩn hoá và chấp nhận mã hợp lệ', () => {
    expect(normalizePostal(' 94526 ')).toBe('94526');
    expect(normalizePostal('ec1a 1bb')).toBe('EC1A 1BB');
  });
  it('quá ngắn hoặc ký tự lạ thì không tra', () => {
    expect(normalizePostal('12')).toBeNull();
    expect(normalizePostal('94526/..')).toBeNull();
    expect(normalizePostal(undefined)).toBeNull();
  });
});

describe('canAutofill', () => {
  it('ô trống thì điền', () => expect(canAutofill('', undefined)).toBe(true));
  it('giá trị do hệ thống điền trước đó thì được thay', () => expect(canAutofill('Danville', 'Danville')).toBe(true));
  it('khách đã tự gõ thì không ghi đè', () => expect(canAutofill('San Ramon', 'Danville')).toBe(false));
});
