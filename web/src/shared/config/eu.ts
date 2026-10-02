import countries from './eu-countries.json';

/** Cùng nguồn dữ liệu với resource EU của backend. Không gồm GB, NO, CH. */
export const EU_COUNTRIES: ReadonlySet<string> = new Set(Object.keys(countries));

export const isEuCountry = (code: string | undefined | null): boolean =>
  EU_COUNTRIES.has((code ?? '').trim().toUpperCase());

/** Form cũ lưu tên nước; hỗ trợ cả tên tiếng Anh và ISO-2 khi khôi phục nháp. */
export function euCountryCode(country: string | undefined | null): string | undefined {
  const text = (country ?? '').trim().replace(/\s+/g, ' ');
  if (isEuCountry(text)) return text.toUpperCase();
  if (text.toLowerCase() === 'czech republic') return 'CZ';
  return Object.entries(countries).find(([, name]) => name.toLowerCase() === text.toLowerCase())?.[0];
}
