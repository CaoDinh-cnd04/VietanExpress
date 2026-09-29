import { useDrafts } from '@/features/drafts/api';
import { useNotifications } from '@/features/notifications';
import { useTroubles } from '@/features/troubles';
import type { BadgeKey } from './nav.config';

/** Số đếm hiển thị trên menu: đơn nháp, sự cố chưa xử lý, thông báo chưa đọc. Dùng chung cache với các trang. */
export function useNavBadges(): Record<BadgeKey, number> {
  const drafts = useDrafts();
  const troubles = useTroubles();
  const notifications = useNotifications();

  return {
    drafts: drafts.data?.length ?? 0,
    troubles: (troubles.data ?? []).filter(t => t.status !== 'done').length,
    notifications: notifications.data?.unreadCount ?? 0
  };
}
