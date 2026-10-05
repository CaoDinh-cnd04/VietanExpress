import type { IconName } from '@/shared/ui';

/** Khóa badge số đếm trên menu — giá trị lấy từ useNavBadges. */
export type BadgeKey = 'drafts' | 'troubles' | 'notifications';

export interface NavLinkItem {
  to: string;
  label: string;
  badge?: BadgeKey;
}

export type NavEntry =
  | ({ kind: 'link'; icon: IconName } & NavLinkItem)
  | { kind: 'group'; id: string; label: string; icon: IconName; children: NavLinkItem[] };

/**
 * Menu sidebar. Thêm trang mới: thêm route trong app/routes.tsx rồi thêm 1 dòng ở đây.
 */
export const NAV: ReadonlyArray<NavEntry> = [
  {
    kind: 'group',
    id: 'create',
    label: 'Tạo đơn',
    icon: 'filePlus',
    children: [
      { to: '/orders/new', label: 'Tạo đơn từng bước' },
      { to: '/orders/new/quick', label: 'Tạo đơn 1 trang' },
      { to: '/orders/import', label: 'Tạo đơn từ Excel' }
    ]
  },
  {
    kind: 'group',
    id: 'orders',
    label: 'Quản lý đơn hàng',
    icon: 'box',
    children: [
      { to: '/drafts', label: 'Đơn nháp & chưa in', badge: 'drafts' },
      { to: '/orders', label: 'Đơn hàng của tôi' },
      { to: '/pickups', label: 'Đặt lịch Pickup' }
    ]
  },
  {
    kind: 'group',
    id: 'sales',
    label: 'Dịch vụ & Bán hàng',
    icon: 'bag',
    children: [
      { to: '/pricing', label: 'Giá & gợi ý dịch vụ' },
      { to: '/ecommerce', label: 'E-commerce' }
    ]
  },
  {
    kind: 'group',
    id: 'support',
    label: 'Hỗ trợ',
    icon: 'help',
    children: [
      { to: '/troubles', label: 'Quản lý sự cố', badge: 'troubles' },
      { to: '/notifications', label: 'Thông báo', badge: 'notifications' },
      { to: '/help', label: 'Trợ giúp & Góp ý' }
    ]
  },
  {
    kind: 'group',
    id: 'account',
    label: 'Tài khoản',
    icon: 'user',
    children: [
      { to: '/account/api-tracking', label: 'API Tracking' },
      { to: '/account/mytracking', label: 'MyTracking cá nhân' },
      { to: '/account/password', label: 'Đổi mật khẩu' }
    ]
  }
];
