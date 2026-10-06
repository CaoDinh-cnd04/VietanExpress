import { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useLocalStorage } from '@/shared/lib/useLocalStorage';
import { cx } from '@/shared/lib/cx';
import { useSession } from '@/features/auth';
import { ImportantNoticeModal } from '@/features/notifications';
import { OnboardingTour, useOnboardingTour } from '@/features/onboarding';
import { useI18n } from '@/shared/i18n';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import styles from './AppShell.module.css';

const MOBILE_QUERY = '(max-width: 1040px)';

/** Khung trang: sidebar + topbar + nội dung route. */
export function AppShell() {
  const [collapsed, setCollapsed] = useLocalStorage('va.nav.collapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();
  const session = useSession();
  const customerCode = session.data?.status === 'authenticated' ? session.data.user.customerCode : undefined;
  const tour = useOnboardingTour(customerCode);

  const toggleMenu = () => {
    if (window.matchMedia(MOBILE_QUERY).matches) setMobileOpen(o => !o);
    else setCollapsed(c => !c);
  };

  // Ctrl+B (⌘+B trên Mac): thu gọn / mở rộng menu — bỏ qua khi đang gõ trong vùng soạn thảo định dạng.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'b') return;
      if ((e.target as HTMLElement | null)?.isContentEditable) return;
      e.preventDefault();
      toggleMenu();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <div className={cx(styles.shell, collapsed && styles.collapsed)}>
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} onExpand={() => setCollapsed(false)} />
      {mobileOpen && <div className={styles.scrim} onClick={() => setMobileOpen(false)} />}
      <div className={styles.main}>
        <Topbar onMenu={toggleMenu} menuCollapsed={collapsed} onStartTour={tour.start} />
        <main className={styles.content}>
          <Suspense fallback={<p className={styles.loading}>{t('Đang tải…')}</p>}>
            <Outlet />
          </Suspense>
        </main>
        <ImportantNoticeModal />
        <OnboardingTour open={tour.open} onClose={tour.close} />
      </div>
    </div>
  );
}
