import type { ReactNode } from 'react';
import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { Icon } from '@/shared/ui';
import { contactUrl, isWebUrl, type AdImage, type MyTrackingConfig } from '../schema';
import { ConfigImage } from './ConfigImage';
import styles from '../pages/MyTrackingPage.module.css';

const socialNetworks = [
  { key: 'facebook', label: 'Facebook', logo: '/social/facebook.png' },
  { key: 'instagram', label: 'Instagram', logo: '/social/instagram.png' },
  { key: 'x', label: 'X', logo: '/social/x.svg' },
  // Nút liên hệ nổi: biểu tượng chính thức (Simple Icons, CC0) màu trắng trên nền màu thương hiệu.
  { key: 'zalo', label: 'Zalo', logo: '/social/zalo-glyph.svg' },
  { key: 'whatsapp', label: 'WhatsApp', logo: '/social/whatsapp-glyph.svg' }
] as const;

interface Props {
  config: MyTrackingConfig;
  /** Khung tra cứu (ô nhập + kết quả) — preview dùng vùng chờ, trang công khai tra cứu thật. */
  children: ReactNode;
  /** Bố cục điện thoại (preview). */
  mobile?: boolean;
  /** Trang công khai /t/{slug}: toàn màn hình, chữ to hơn preview. */
  standalone?: boolean;
}

/** Trang tra cứu mang thương hiệu của khách: logo, thông tin công ty, ảnh quảng cáo, mạng xã hội, nút liên hệ. */
export function TrackingLayout({ config, children, mobile, standalone }: Props) {
  const { t } = useI18n();
  const social = socialNetworks.map(network => {
    const value = config.brand[network.key];
    const href = network.key === 'zalo' || network.key === 'whatsapp'
      ? contactUrl(value, network.key) : isWebUrl(value) ? value : '';
    return { ...network, href };
  }).filter(network => network.href);
  const phone = config.brand.phone.replace(/[^\d+]/g, '');
  const footerSocial = social.filter(network => ['facebook', 'instagram', 'x'].includes(network.key));
  const floatingSocial = social.filter(network => ['zalo', 'whatsapp'].includes(network.key));

  return <div className={cx(styles.previewPage, mobile && styles.mobile, standalone && styles.standalone)}>
    {config.background && <div className={styles.backdrop} aria-hidden="true"><ConfigImage src={config.background} alt="" className={styles.backgroundImage} /></div>}
    <div className={styles.trackingShell}>
      <header className={styles.brandHeader}>
        {config.brand.logo
          ? <ConfigImage src={config.brand.logo} alt="Logo" className={styles.logo} />
          : <span className={styles.neutralLogo}>Logo</span>}
        <div className={styles.brandInfo}>
          <strong>{config.brand.companyName || t('Tên công ty của bạn')}</strong>
          <p>{config.brand.address || t('Địa chỉ công ty')}</p>
          <p>{config.brand.phone || t('Số điện thoại liên hệ')}</p>
        </div>
      </header>
      <div className={styles.trackingColumns}>
        <div className={styles.trackingMain}>{children}</div>
        <aside className={styles.advertisingPanel}>
          <h3 className={styles.promotionTitle}>{config.title}</h3>
          {config.description && <p className={styles.description}>{config.description}</p>}
          {config.images.length ? config.images.map((image, index) => <Advertisement key={image.id} image={image} index={index} />)
            : <div className={styles.neutralAd}><Icon name="image" size={28} /><span>{t('Hình ảnh quảng cáo')}</span></div>}
        </aside>
      </div>
      {footerSocial.length > 0 && <footer className={styles.connect}>
        <strong>Connect with us:</strong>
        <div className={styles.socialIcons}>{footerSocial.map(network =>
          <a key={network.key} className={styles[network.key]} href={network.href} target="_blank" rel="noreferrer" aria-label={network.label} title={network.label}>
            <img src={network.logo} alt="" aria-hidden="true" width={24} height={24} />
          </a>)}</div>
      </footer>}
    </div>
    {(phone || floatingSocial.length > 0) && <nav className={styles.floatingContacts} aria-label={t('Liên hệ')}>
      {phone && <a className={styles.phone} href={`tel:${phone}`} aria-label={t('Số điện thoại')}><Icon name="phone" size={16} /></a>}
      {floatingSocial.map(network =>
        <a key={network.key} className={styles[network.key]} href={network.href} target="_blank" rel="noreferrer" aria-label={network.label} title={network.label}>
          <img src={network.logo} alt="" aria-hidden="true" width={22} height={22} />
        </a>)}
    </nav>}
  </div>;
}

function Advertisement({ image, index }: { image: AdImage; index: number }) {
  const { t } = useI18n();
  const linked = isWebUrl(image.linkUrl);
  const content = <>
    <ConfigImage src={image.src} alt={image.title || t('Ảnh quảng cáo {n}', { n: index + 1 })} className={styles.adImage} />
    {(image.title || image.buttonText) && <div className={styles.adCaption}>
      {image.title && <strong>{image.title}</strong>}
      {image.buttonText && (linked
        ? <span className={styles.adButton}>{image.buttonText}</span>
        : <button type="button" className={styles.adButton} disabled>{image.buttonText}</button>)}
    </div>}
  </>;
  return linked
    ? <a className={styles.advertisement} href={image.linkUrl} target="_blank" rel="noreferrer">{content}</a>
    : <div className={styles.advertisement}>{content}</div>;
}
