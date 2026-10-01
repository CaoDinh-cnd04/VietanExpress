import type { Category } from '../api';
import { fold } from './product-library';

export interface CategoryGroups {
  favorites: Category[];
  others: Category[];
}

/**
 * Chia nhóm hàng cho ô chọn: "Nhóm yêu thích" (khách đánh dấu sao) và các nhóm còn lại,
 * lọc theo ô tìm (không phân biệt dấu, hoa thường). Giữ thứ tự backend trả.
 * `label` đổi tên hiển thị (vd bản dịch) để tìm theo đúng chữ khách thấy.
 */
export function groupCategories(categories: readonly Category[], query: string, label: (name: string) => string = n => n): CategoryGroups {
  const words = fold(query).split(/\s+/).filter(Boolean);
  const shown = categories.filter(c => {
    const text = fold(`${c.name} ${label(c.name)}`);
    return words.every(w => text.includes(w));
  });
  return { favorites: shown.filter(c => c.isFavorite), others: shown.filter(c => !c.isFavorite) };
}
