import { Link, useMatches, useNavigate } from 'react-router-dom';
import { initialsOf, useLogout, useSession } from '@/features/auth';
import { useI18n } from '@/shared/i18n';
import { useTheme } from '@/shared/lib/useTheme';
import { DropdownMenu, Icon, type MenuItem } from '@/shared/ui';
import type { RouteHandle } from '../routes';
import { useNavBadges } from './useNavBadges';
import styles from './Topbar.module.css';

export function Topbar({ onMenu, onStartTour }: { onMenu: () => void; onStartTour: () => void }) {
  const matches = useMatches();
  const title = [...matches].reverse().map(m => (m.handle as RouteHandle | undefined)?.title).find(Boolean) ?? '';
  const { theme, toggle } = useTheme();
  const { t, lang, setLang } = useI18n();
  const { notifications } = useNavBadges();
  const session = useSession();
  const logout = useLogout();
  const navigate = useNavigate();
  const user = session.data?.status === 'authenticated' ? session.data.user : undefined;
  const initials = initialsOf(user?.companyName);

  const menu: MenuItem[] = [
    { label: 'Xem hướng dẫn sử dụng', onSelect: onStartTour },
    { label: 'Đổi mật khẩu', onSelect: () => void navigate('/account/password') },
    { label: 'Trang giới thiệu', onSelect: () => void navigate('/') },
    ...(user
      ? [{ label: 'Đăng xuất', danger: true, onSelect: () => logout.mutate(undefined, { onSettled: () => void navigate('/login', { replace: true }) }) }]
      : [])
  ];

  return (
    <header className={styles.topbar}>
      <button type="button" className={styles.iconBtn} onClick={onMenu} aria-label={t('Ẩn/hiện menu')}>
        <Icon name="menu" />
      </button>
      <nav className={styles.crumb} aria-label="Breadcrumb">
        <span>{t('Portal khách hàng')}</span>
        {title && <><span aria-hidden="true">/</span><strong>{t(title)}</strong></>}
      </nav>
      <div className={styles.right}>
        <div className={styles.lang} role="group" aria-label={t('Ngôn ngữ')}>
          {(['vi', 'en'] as const).map(l => (
            <button key={l} type="button" className={l === lang ? styles.langOn : undefined} aria-pressed={l === lang} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <button type="button" className={styles.iconBtn} onClick={toggle} aria-label={t(theme === 'dark' ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối')}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <Link to="/notifications" className={styles.iconBtn} data-tour="notifications" aria-label={notifications ? t('Thông báo, {n} chưa đọc', { n: notifications }) : t('Thông báo')}>
          <Icon name="bell" />
          {notifications > 0 && <span className={styles.dot}>{notifications}</span>}
        </Link>
        <DropdownMenu
          items={menu}
          trigger={({ open, toggle }) => (
            <button type="button" className={styles.avatar} data-tour="account" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label={t('Tài khoản')} title={user?.companyName}>
              {initials || <Icon name="user" size={16} />}
            </button>
          )}
        />
      </div>
    </header>
  );
}
