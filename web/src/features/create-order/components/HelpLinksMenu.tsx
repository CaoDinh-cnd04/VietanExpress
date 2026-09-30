import { useI18n } from '@/shared/i18n';
import { Button, DropdownMenu, Icon, useToast } from '@/shared/ui';
import { HELP_LINKS } from '../constants';
import styles from './form.module.css';

/** Nút "Tra cứu & hỗ trợ" — thay khung Hỗ trợ bên phải của Bill Online cũ. */
export function HelpLinksMenu() {
  const toast = useToast();
  const { t } = useI18n();
  return (
    <DropdownMenu
      trigger={({ open, toggle }) => (
        <Button size="sm" onClick={toggle} aria-expanded={open} aria-haspopup="true">
          {t('Tra cứu & hỗ trợ')} <Icon name="chevronDown" size={14} />
        </Button>
      )}
    >
      <div className={styles.helpPanel}>
        {HELP_LINKS.map(g => (
          <section key={g.group} className={styles.helpGroup}>
            <h4>{t(g.group)}</h4>
            <div className={styles.helpLinks}>
              {g.links.map(l =>
                l.url ? (
                  <a key={l.label} href={l.url} target="_blank" rel="noreferrer">{t(l.label)}</a>
                ) : (
                  <button key={l.label} type="button" onClick={() => toast.show(t('{group} — {link}: đang cập nhật liên kết', { group: t(g.group), link: t(l.label) }))}>{t(l.label)}</button>
                )
              )}
            </div>
          </section>
        ))}
      </div>
    </DropdownMenu>
  );
}
