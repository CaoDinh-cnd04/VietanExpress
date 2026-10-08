import { useId, useState, type KeyboardEvent } from 'react';
import { suggestionOptionId } from '../components/SuggestionList';

/**
 * Trạng thái ô nhập có danh sách gợi ý: mở khi khách gõ, đóng khi rời ô / Esc / chọn xong;
 * ↑ ↓ di chuyển, Enter chọn. Trả props gắn vào ô nhập (role combobox, aria) và vào SuggestionList.
 */
export function useCombobox<T>(items: readonly T[], onPick: (item: T) => void) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const visible = open ? items : [];

  const pick = (index: number) => {
    const item = visible[index];
    if (item === undefined) return;
    setOpen(false);
    setActive(-1);
    onPick(item);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') return setOpen(false);
    if (!visible.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive(i => (i + step + visible.length) % visible.length);
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(active);
    }
  };

  return {
    listId,
    visible,
    active,
    pick,
    /** Gọi khi khách gõ vào ô. */
    onType: () => {
      setOpen(true);
      setActive(-1);
    },
    close: () => setOpen(false),
    inputProps: {
      role: 'combobox',
      autoComplete: 'off',
      'aria-autocomplete': 'list' as const,
      'aria-expanded': visible.length > 0,
      'aria-controls': listId,
      'aria-activedescendant': active >= 0 && visible.length ? suggestionOptionId(listId, active) : undefined,
      onKeyDown
    }
  };
}
