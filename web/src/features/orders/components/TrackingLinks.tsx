import { trackingLink, vaTrackingLink } from '@/shared/config/domain';
import { useCopyToClipboard } from '@/shared/lib/useCopyToClipboard';
import { Icon } from '@/shared/ui';
import styles from './TrackingLinks.module.css';

/** VA Track (thương hiệu Việt An) & Your Track (thương hiệu đại lý) — mở link hoặc sao chép. */
export function TrackingLinks({ bill }: { bill: string }) {
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
          <button type="button" className={styles.copy} onClick={() => copy(l.url, `Đã sao chép link ${l.label}`)} aria-label={`Sao chép link ${l.label}`} title="Sao chép link">
            <Icon name="copy" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
