import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import styles from './Toast.module.css';

type ToastTone = 'default' | 'success' | 'error';
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const TOAST_MS = 3200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const { t } = useI18n();

  const show = useCallback((message: string, tone: ToastTone = 'default') => {
    const id = Date.now() + Math.random();
    setItems(list => [...list, { id, message, tone }]);
    window.setTimeout(() => setItems(list => list.filter(t => t.id !== id)), TOAST_MS);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.stack} role="status" aria-live="polite">
        {items.map(item => (
          <div key={item.id} className={cx(styles.toast, styles[item.tone])}>{t(item.message)}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Hiện thông báo ngắn: const toast = useToast(); toast.show('Đã lưu', 'success'). */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast phải nằm trong <ToastProvider>');
  return ctx;
}
