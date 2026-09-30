/**
 * Quét mã nguồn tìm chữ tiếng Việt chưa dịch — dùng trong test i18n (và chạy tay để xem danh sách còn thiếu).
 * - Chuỗi trong nháy đơn / kép có dấu tiếng Việt → phải có trong từ điển EN (hoặc trong NO_TRANSLATE).
 * - Chữ tiếng Việt viết thẳng trong JSX (<p>Xin chào</p>) hoặc trong template literal → phải bọc t().
 */
const VIET = /[À-ỹĐđ]/;

/** Bỏ chú thích (// và /* *\/) để không bắt nhầm; giữ nguyên chuỗi có "//" như URL. */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(line => line.replace(/(^|\s)\/\/.*$/, '$1'))
    .join('\n');
}

export interface Finding {
  kind: 'missing' | 'jsx-text' | 'template';
  text: string;
}

export function findUntranslated(
  source: string,
  has: (text: string) => boolean,
  ignore: (text: string) => boolean = () => false
): Finding[] {
  const code = stripComments(source);
  const out: Finding[] = [];

  for (const m of code.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)) {
    const text = (m[1] ?? m[2] ?? '').replace(/\\(.)/g, '$1');
    if (VIET.test(text) && !has(text)) out.push({ kind: 'missing', text });
  }
  for (const m of code.matchAll(/`([^`]*)`/g)) {
    const raw = m[1] ?? '';
    // Chỉ tính phần chữ ngoài ${…}
    const plain = raw.replace(/\$\{[^}]*\}/g, '').trim();
    if (VIET.test(plain) && !ignore(plain)) out.push({ kind: 'template', text: raw.trim() });
  }
  for (const m of code.matchAll(/>([^<>{}]*[À-ỹĐđ][^<>{}]*)</g)) {
    const text = (m[1] ?? '').trim();
    if (text && !ignore(text) && !text.includes('=>') && !/[;()]\s*$/.test(text)) out.push({ kind: 'jsx-text', text });
  }
  return out;
}
