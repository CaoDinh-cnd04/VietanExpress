import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/shared/lib/cx';
import styles from './DropdownMenu.module.css';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

interface DropdownMenuProps {
  /** Nội dung nút mở menu. */
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items?: ReadonlyArray<MenuItem>;
  /** Nội dung tùy biến thay cho danh sách items (VD bảng liên kết). */
  children?: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

const GAP = 4;

/**
 * Menu thả xuống. Menu được render qua portal (position: fixed) nên không bị
 * cắt bởi khung cuộn của bảng. Đóng khi bấm ra ngoài, nhấn Esc, cuộn hoặc đổi kích thước.
 */
export function DropdownMenu({ trigger, items, children, align = 'end', className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !rootRef.current || !menuRef.current) return;
    const r = rootRef.current.getBoundingClientRect();
    const m = menuRef.current.getBoundingClientRect();
    const fitsBelow = r.bottom + GAP + m.height <= window.innerHeight;
    const top = fitsBelow ? r.bottom + GAP : Math.max(GAP, r.top - GAP - m.height);
    const left = align === 'end' ? Math.max(GAP, r.right - m.width) : Math.min(r.left, window.innerWidth - m.width - GAP);
    setPos({ top, left });
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !menuRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cx(styles.root, className)}>
      {trigger({ open, toggle: () => setOpen(o => !o) })}
      {open &&
        createPortal(
          <div ref={menuRef} className={styles.menu} style={{ visibility: pos.top === undefined ? 'hidden' : 'visible', ...pos }} role="menu">
            {children ??
              items?.map(item => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className={cx(styles.item, item.danger && styles.danger)}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                >
                  {item.label}
                </button>
              ))}
          </div>,
          document.body
        )}
    </div>
  );
}
