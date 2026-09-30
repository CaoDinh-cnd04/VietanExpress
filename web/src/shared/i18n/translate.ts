/** Ngôn ngữ giao diện. Chữ gốc trong code là tiếng Việt; tiếng Anh tra theo từ điển. */
export type Lang = 'vi' | 'en';

export type Vars = Record<string, string | number>;

export type Dictionary = Readonly<Record<string, string>>;

/** Điền {biến} vào câu (không dịch) — để hàm thuần tạo câu tiếng Việt có số liệu, component dịch sau. */
export const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Template {
  regex: RegExp;
  names: string[];
  target: string;
  /** Số ký tự cố định (không tính biến) — mẫu cụ thể hơn được thử trước. */
  literal: number;
}

/**
 * Khoá có biến, vd "Tối đa {n} ký tự" → "Max {n} characters", để dịch cả câu đã điền số
 * (thông báo lỗi của form, thông báo từ máy chủ…).
 */
function compileTemplates(dict: Dictionary): Template[] {
  return Object.entries(dict)
    .filter(([key]) => /\{\w+\}/.test(key))
    .map(([key, target]) => {
      const names: string[] = [];
      const pattern = key
        .split(/(\{\w+\})/)
        .map(part => {
          const m = /^\{(\w+)\}$/.exec(part);
          if (!m) return escape(part);
          names.push(m[1]!);
          return '(.+?)';
        })
        .join('');
      return { regex: new RegExp(`^${pattern}$`), names, target, literal: key.replace(/\{\w+\}/g, '').length };
    })
    // Mẫu nhiều chữ cố định khớp trước: "Kiện {i}: vượt giới hạn…" không bị "Kiện {n}" nuốt mất.
    .sort((a, b) => b.literal - a.literal);
}

/** Bộ dịch cho 1 từ điển: exact match trước, rồi khớp mẫu có biến; không có → giữ tiếng Việt. */
export function createTranslator(dict: Dictionary) {
  const templates = compileTemplates(dict);
  return (lang: Lang, text: string, vars?: Vars): string => {
    if (lang === 'vi' || !text) return fill(text, vars);
    const exact = dict[text];
    if (exact !== undefined) return fill(exact, vars);
    for (const t of templates) {
      const m = t.regex.exec(text);
      if (!m) continue;
      const found: Vars = {};
      t.names.forEach((name, i) => (found[name] = m[i + 1]!));
      return fill(t.target, { ...found, ...vars });
    }
    return fill(text, vars);
  };
}
