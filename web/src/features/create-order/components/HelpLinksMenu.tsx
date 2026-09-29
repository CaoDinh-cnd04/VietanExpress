import { Button, DropdownMenu, Icon, useToast } from '@/shared/ui';
import { HELP_LINKS } from '../constants';
import styles from './form.module.css';

/** Nút "Tra cứu & hỗ trợ" — thay khung Hỗ trợ bên phải của Bill Online cũ. */
export function HelpLinksMenu() {
  const toast = useToast();
  return (
    <DropdownMenu
      trigger={({ open, toggle }) => (
        <Button size="sm" onClick={toggle} aria-expanded={open} aria-haspopup="true">
          Tra cứu & hỗ trợ <Icon name="chevronDown" size={14} />
        </Button>
      )}
    >
      <div className={styles.helpPanel}>
        {HELP_LINKS.map(g => (
          <section key={g.group} className={styles.helpGroup}>
            <h4>{g.group}</h4>
            <div className={styles.helpLinks}>
              {g.links.map(l =>
                l.url ? (
                  <a key={l.label} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
                ) : (
                  <button key={l.label} type="button" onClick={() => toast.show(`${g.group} — ${l.label}: đang cập nhật liên kết`)}>{l.label}</button>
                )
              )}
            </div>
          </section>
        ))}
      </div>
    </DropdownMenu>
  );
}
