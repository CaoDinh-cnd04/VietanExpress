import { useI18n } from '@/shared/i18n';
import { useCopyToClipboard } from '@/shared/lib/useCopyToClipboard';
import { Button, Icon, StatusPill, TextField } from '@/shared/ui';
import type { Publication } from '../api';
import { normalizeSlug, publicTrackingUrl, slugError } from '../lib/slug';
import styles from '../pages/MyTrackingPage.module.css';

/** Đường dẫn công khai /t/{slug} + trạng thái xuất bản; lưu cùng nút Lưu / Xuất bản của form. */
export function PublishPanel({ publication, onSlugChange, disabled }: {
  publication: Publication;
  onSlugChange: (slug: string) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const copy = useCopyToClipboard();
  const url = publicTrackingUrl(publication.slug, window.location.origin);
  const error = publication.slug ? slugError(publication.slug) : undefined;

  return <section className={`${styles.card} ${styles.publish}`}>
    <div className={styles.publishHead}>
      <h2>{t('Trang tra cứu công khai')}</h2>
      <StatusPill tone={publication.published ? 'success' : 'neutral'}>{publication.published ? 'Đã xuất bản' : 'Chưa xuất bản'}</StatusPill>
    </div>
    <p className={styles.hint}>
      {t('Gửi link này cho người nhận hàng để họ tra cứu vận đơn trên trang mang thương hiệu của bạn. Thay đổi chỉ hiện trên link sau khi bấm Lưu.')}
    </p>
    <div className={styles.slugRow}>
      <TextField label="Đường dẫn" prefix="/t/" value={publication.slug} disabled={disabled} maxLength={60} error={error}
        onChange={e => onSlugChange(normalizeSlug(e.target.value))} />
      <div className={styles.linkBox}>
        <code>{url}</code>
        <Button size="sm" disabled={!publication.slug || !!error} onClick={() => void copy(url, t('Đã sao chép link tra cứu'))}>
          <Icon name="copy" size={14} /> {t('Sao chép')}
        </Button>
        {publication.published && <a className={styles.openLink} href={url} target="_blank" rel="noreferrer">{t('Mở trang')}</a>}
      </div>
    </div>
  </section>;
}
