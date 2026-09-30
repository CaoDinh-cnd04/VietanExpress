/**
 * Quét mã nguồn tìm chữ tiếng Việt chưa dịch — dùng trong test i18n (và chạy tay để xem danh sách còn thiếu).
 * - Chuỗi trong nháy đơn / kép có dấu tiếng Việt → phải có trong từ điển EN (hoặc trong NO_TRANSLATE).
 * - Chữ tiếng Việt viết thẳng trong JSX (<p>Xin chào</p>) hoặc trong template literal → phải bọc t().
 */
/** Chữ có dấu tiếng Việt (bỏ × ÷ nằm giữa dải Latin-1). */
const VIET = /[À-ÖØ-öø-ỹĐđ]/;

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
  // Chữ JSX, kể cả xen biểu thức: <span>{n} đơn nháp</span> → phần ngoài {…} là "đơn nháp".
  // Bỏ chuỗi (đã xét ở trên) và mọi {…} lồng nhau trước, chỉ còn chữ viết thẳng giữa các thẻ.
  let jsx = code.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`[^`]*`/g, '""');
  for (let prev = ''; prev !== jsx; ) {
    prev = jsx;
    jsx = jsx.replace(/\{[^{}]*\}/g, ' ');
  }
  for (const m of jsx.matchAll(/>([^<>]*)</g)) {
    const text = (m[1] ?? '').replace(/\s+/g, ' ').trim();
    if (text && VIET.test(text) && !ignore(text)) out.push({ kind: 'jsx-text', text });
  }
  return out;
}
