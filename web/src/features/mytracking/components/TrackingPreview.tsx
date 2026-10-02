import { useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { Icon, SegmentedControl } from '@/shared/ui';
import { contactUrl, isWebUrl, type AdImage, type MyTrackingConfig } from '../schema';
import { ConfigImage } from './ConfigImage';
import styles from '../pages/MyTrackingPage.module.css';

const socialNetworks = [
  { key: 'facebook', label: 'Facebook', logo: '/social/facebook.png', mark: '' },
  { key: 'instagram', label: 'Instagram', logo: '/social/instagram.png', mark: '' },
  { key: 'x', label: 'X', logo: '/social/x.svg', mark: '' },
  { key: 'zalo', label: 'Zalo', logo: '/social/zalo.svg', mark: '' },
  { key: 'whatsapp', label: 'WhatsApp', logo: '', mark: 'WA' }
] as const;

/** Bản xem trước bố cục; không tạo sự kiện vận chuyển giả. */
export function TrackingPreview({ config }: { config: MyTrackingConfig }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop');
  const social = socialNetworks.map(network => {
    const value = config.brand[network.key];
    const href = network.key === 'zalo' || network.key === 'whatsapp'
      ? contactUrl(value, network.key) : isWebUrl(value) ? value : '';
    return { ...network, href };
  }).filter(network => network.href);
  const phone = config.brand.phone.replace(/[^\d+]/g, '');

  return <section className={`${styles.card} ${styles.previewCard}`}>
    <div className={styles.previewHeader}>
      <h2>{t('Xem trước MyTracking')}</h2>
      <SegmentedControl ariaLabel={t('Chế độ xem trước')} value={mode} onChange={setMode}
        options={[{ value: 'desktop', label: 'Máy tính' }, { value: 'mobile', label: 'Điện thoại' }]} />
    </div>
    <div className={styles.previewViewport}>
      <div className={`${styles.previewPage} ${mode === 'mobile' ? styles.mobile : ''}`}>
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
            <div className={styles.trackingMain}>
              <div className={styles.trackingSearch}>
                <input aria-label="Tracking number" placeholder="Tracking number" readOnly />
                <button type="button" disabled>Track</button>
              </div>
              <h3 className={styles.blackBar}>TRACKING DETAIL</h3>
              <div className={styles.trackingPlaceholder}>
                <Icon name="box" size={26} />
                <p>{t('Kết quả tra cứu sẽ hiển thị tại đây')}</p>
                <span>{t('Bản xem trước bố cục · chưa tra cứu vận đơn')}</span>
              </div>
            </div>
            <aside className={styles.advertisingPanel}>
              <h3 className={styles.promotionTitle}>{config.title}</h3>
              {config.description && <p className={styles.description}>{config.description}</p>}
              {config.images.length ? config.images.map((image, index) => <Advertisement key={image.id} image={image} index={index} />)
                : <div className={styles.neutralAd}><Icon name="image" size={28} /><span>{t('Hình ảnh quảng cáo')}</span></div>}
            </aside>
          </div>
          {social.some(network => ['facebook', 'instagram', 'x'].includes(network.key)) && <footer className={styles.connect}>
            <strong>Connect with us:</strong>
            <div className={styles.socialIcons}>{social.filter(network => ['facebook', 'instagram', 'x'].includes(network.key)).map(network =>
              <a key={network.key} className={styles[network.key]} href={network.href} target="_blank" rel="noreferrer" aria-label={network.label} title={network.label}>
                {network.logo ? <img src={network.logo} alt="" aria-hidden="true" width={24} height={24} /> : network.mark}
              </a>)}</div>
          </footer>}
        </div>
        {(phone || social.some(network => ['zalo', 'whatsapp'].includes(network.key))) && <nav className={styles.floatingContacts} aria-label={t('Liên hệ')}>
          {phone && <a className={styles.phone} href={`tel:${phone}`} aria-label={t('Số điện thoại')}><Icon name="phone" size={16} /></a>}
          {social.filter(network => ['zalo', 'whatsapp'].includes(network.key)).map(network =>
            <a key={network.key} className={styles[network.key]} href={network.href} target="_blank" rel="noreferrer" aria-label={network.label} title={network.label}>
              {network.logo ? <img src={network.logo} alt="" aria-hidden="true" width={50} height={19} /> : network.mark}
            </a>)}
        </nav>}
      </div>
    </div>
  </section>;
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
