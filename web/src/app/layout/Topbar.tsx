import { Link, useMatches, useNavigate } from 'react-router-dom';
import { initialsOf, useLogout, useSession } from '@/features/auth';
import { useTheme } from '@/shared/lib/useTheme';
import { DropdownMenu, Icon, type MenuItem } from '@/shared/ui';
import type { RouteHandle } from '../routes';
import { useNavBadges } from './useNavBadges';
import styles from './Topbar.module.css';

export function Topbar({ onMenu, onStartTour }: { onMenu: () => void; onStartTour: () => void }) {
  const matches = useMatches();
  const title = [...matches].reverse().map(m => (m.handle as RouteHandle | undefined)?.title).find(Boolean) ?? '';
  const { theme, toggle } = useTheme();
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
      <button type="button" className={styles.iconBtn} onClick={onMenu} aria-label="Ẩn/hiện menu">
        <Icon name="menu" />
      </button>
      <nav className={styles.crumb} aria-label="Breadcrumb">
        <span>Portal khách hàng</span>
        {title && <><span aria-hidden="true">/</span><strong>{title}</strong></>}
      </nav>
      <div className={styles.right}>
        <button type="button" className={styles.iconBtn} onClick={toggle} aria-label={theme === 'dark' ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <Link to="/notifications" className={styles.iconBtn} data-tour="notifications" aria-label={`Thông báo${notifications ? `, ${notifications} chưa đọc` : ''}`}>
          <Icon name="bell" />
          {notifications > 0 && <span className={styles.dot}>{notifications}</span>}
        </Link>
        <DropdownMenu
          items={menu}
          trigger={({ open, toggle }) => (
            <button type="button" className={styles.avatar} data-tour="account" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label="Tài khoản" title={user?.companyName}>
              {initials || <Icon name="user" size={16} />}
            </button>
          )}
        />
      </div>
    </header>
  );
}
