import type { Tone } from '@/shared/ui';
import type { TroublePriority, TroubleStatus } from './types';

export const TROUBLE_TYPES = [
  'Giao chậm / trễ hẹn',
  'Thất lạc kiện hàng',
  'Hư hỏng / vỡ hàng',
  'Thiếu hàng trong kiện',
  'Sai thông tin người nhận',
  'Phát sai địa chỉ',
  'Vấn đề phụ phí / cước',
  'Yêu cầu giữ / đổi địa chỉ',
  'Khác'
] as const;

export const TROUBLE_PRIORITY: Record<TroublePriority, { label: string; tone: Tone }> = {
  low: { label: 'Thường', tone: 'neutral' },
  mid: { label: 'Gấp', tone: 'warning' },
  high: { label: 'Rất gấp', tone: 'danger' }
};

export const TROUBLE_STATUS: Record<TroubleStatus, { label: string; tone: Tone }> = {
  new: { label: 'Mới', tone: 'info' },
  doing: { label: 'Đang xử lý', tone: 'success' },
  waitc: { label: 'Chờ khách phản hồi', tone: 'warning' },
  done: { label: 'Đã xử lý', tone: 'brand' }
};

export const TROUBLE_TABS: ReadonlyArray<{ key: TroubleStatus | 'all' | 'open'; label: string }> = [
  { key: 'open', label: 'Chưa xong' },
  { key: 'all', label: 'Tất cả' },
  ...(Object.keys(TROUBLE_STATUS) as TroubleStatus[]).map(key => ({ key, label: TROUBLE_STATUS[key].label }))
];
