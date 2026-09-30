import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useLocalStorage } from '@/shared/lib/useLocalStorage';
import { EN } from './en';
import { createTranslator, type Lang, type Vars } from './translate';

const translate = createTranslator(EN);

interface I18nApi {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Dịch câu tiếng Việt sang ngôn ngữ đang chọn; `vars` điền vào {tên}. */
  t: (text: string, vars?: Vars) => string;
}

const I18nContext = createContext<I18nApi | null>(null);

/** Ngôn ngữ giao diện VI / EN — mặc định tiếng Việt, nhớ lựa chọn trên trình duyệt. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useLocalStorage<Lang>('va.lang', 'vi');
  const lang: Lang = stored === 'en' ? 'en' : 'vi';

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((text: string, vars?: Vars) => translate(lang, text, vars), [lang]);
  const api = useMemo(() => ({ lang, setLang: setStored, t }), [lang, setStored, t]);
  return <I18nContext.Provider value={api}>{children}</I18nContext.Provider>;
}

/** const { t, lang, setLang } = useI18n(); <h1>{t('Tạo đơn')}</h1> */
export function useI18n(): I18nApi {
  const ctx = useContext(I18nContext);
  // Ngoài provider (test component lẻ) → tiếng Việt.
  return ctx ?? { lang: 'vi', setLang: () => undefined, t: (text, vars) => translate('vi', text, vars) };
}

/** Dịch nếu là chuỗi; ReactNode khác giữ nguyên. Dùng trong component dùng chung nhận prop kiểu ReactNode. */
export function useTranslateNode() {
  const { t } = useI18n();
  return <N,>(node: N): N | string => (typeof node === 'string' ? t(node) : node);
}
