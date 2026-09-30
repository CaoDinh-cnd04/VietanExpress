import { describe, expect, it } from 'vitest';
import { findUntranslated, type Finding } from './coverage';
import { EN } from './en';
import { NO_TRANSLATE } from './no-translate';
import { createTranslator } from './translate';

const translate = createTranslator(EN);
/** Có bản dịch: đúng khoá, khớp mẫu có biến, hoặc cố ý không dịch. */
const has = (text: string) => NO_TRANSLATE.has(text) || text in EN || translate('en', text) !== text;

// Toàn bộ mã giao diện (trừ test và chính từ điển).
const sources = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}', '!/src/shared/i18n/**'], {
  query: '?raw',
  import: 'default',
  eager: true
});

/**
 * Thư mục đã dịch xong — test bắt buộc với các thư mục này. Đang dịch dần theo đợt; xong hết thì bỏ bộ lọc.
 */
const DONE = [
  '/src/app/',
  '/src/shared/',
  '/src/features/auth/',
  '/src/features/onboarding/',
  '/src/features/create-order/',
  '/src/features/drafts/',
  '/src/features/orders/',
  '/src/features/order-import/',
  '/src/features/account/',
  '/src/features/dashboard/',
  '/src/features/notifications/',
  '/src/features/pickups/',
  '/src/features/troubles/',
  '/src/features/support/',
  '/src/features/pricing/',
  '/src/features/ecommerce/'
];
// Xem trước thư mục đang dịch: I18N_EXTRA=/src/features/create-order/ npx vitest run src/shared/i18n
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const EXTRA = (env.I18N_EXTRA ?? '').split(',').filter(Boolean);
const inScope = (file: string) => [...DONE, ...EXTRA].some(p => file.startsWith(p));

describe('bản tiếng Anh', () => {
  it('mọi chữ tiếng Việt trong giao diện đều đã bọc t() và có bản dịch', () => {
    const problems: string[] = [];
    for (const [file, source] of Object.entries(sources)) {
      if (!inScope(file)) continue;
      for (const f of findUntranslated(source, has, text => NO_TRANSLATE.has(text)) as Finding[]) problems.push(`${file} [${f.kind}] ${f.text}`);
    }
    // Đang xem trước thư mục chưa xong: in đủ danh sách (thông báo lỗi của vitest bị cắt ngắn).
    if (EXTRA.length && problems.length) console.log(problems.join('\n'));
    expect(problems, `${problems.length} chỗ chưa dịch:\n${problems.join('\n')}`).toEqual([]);
  });

  it('khoá khai ở nhiều file từ điển phải cùng bản dịch', () => {
    const parts = import.meta.glob<Record<string, Record<string, string>>>(['./en/*.ts', '!./en/index.ts'], { eager: true });
    const seen = new Map<string, { file: string; value: string }>();
    const conflicts: string[] = [];
    for (const [file, mod] of Object.entries(parts)) {
      for (const dict of Object.values(mod)) {
        for (const [key, value] of Object.entries(dict)) {
          const prev = seen.get(key);
          if (prev && prev.value !== value) conflicts.push(`${key}: ${prev.file} "${prev.value}" ≠ ${file} "${value}"`);
          seen.set(key, { file, value });
        }
      }
    }
    expect(conflicts).toEqual([]);
  });

  it('bản dịch không để trống', () => {
    expect(Object.entries(EN).filter(([, v]) => !v.trim()).map(([k]) => k)).toEqual([]);
  });
});
