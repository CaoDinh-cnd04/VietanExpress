import { trackingLink, vaTrackingLink } from '@/shared/config/domain';
import { useI18n } from '@/shared/i18n';
import { useCopyToClipboard } from '@/shared/lib/useCopyToClipboard';
import { Icon } from '@/shared/ui';
import styles from './TrackingLinks.module.css';

/** VA Track (thương hiệu Việt An) & Your Track (thương hiệu đại lý) — mở link hoặc sao chép. */
export function TrackingLinks({ bill }: { bill: string }) {
  const { t } = useI18n();
  const copy = useCopyToClipboard();
  const links = [
    { label: 'VA Track', url: vaTrackingLink(bill) },
    { label: 'Your Track', url: trackingLink(bill, true) }
  ];

  return (
    <div className={styles.list}>
      {links.map(l => (
        <div key={l.label} className={styles.item}>
          <a href={l.url} target="_blank" rel="noreferrer" className={styles.link}>{l.label}</a>
          <button type="button" className={styles.copy} onClick={() => copy(l.url, t('Đã sao chép link {name}', { name: l.label }))} aria-label={t('Sao chép link {name}', { name: l.label })} title={t('Sao chép link')}>
            <Icon name="copy" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
