import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

type Theme = 'light' | 'dark';

const systemTheme = (): Theme => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

/** Giao diện sáng/tối: mặc định theo hệ điều hành, người dùng đổi thì ghi nhớ. */
export function useTheme() {
  const [stored, setStored] = useLocalStorage<Theme | null>('va.theme', null);
  const theme = stored ?? systemTheme();

  useEffect(() => {
    if (stored) document.documentElement.dataset.theme = stored;
    else delete document.documentElement.dataset.theme;
  }, [stored]);

  return { theme, toggle: () => setStored(theme === 'dark' ? 'light' : 'dark') };
}
