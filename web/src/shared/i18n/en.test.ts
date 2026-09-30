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

describe('bản tiếng Anh', () => {
  it('mọi chữ tiếng Việt trong giao diện đều đã bọc t() và có bản dịch', () => {
    const problems: string[] = [];
    for (const [file, source] of Object.entries(sources)) {
      for (const f of findUntranslated(source, has, text => NO_TRANSLATE.has(text)) as Finding[]) problems.push(`${file} [${f.kind}] ${f.text}`);
    }
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
