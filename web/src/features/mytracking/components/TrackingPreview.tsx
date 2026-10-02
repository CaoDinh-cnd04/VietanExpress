import { useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { Icon, SegmentedControl } from '@/shared/ui';
import { isWebUrl, type MyTrackingConfig } from '../schema';
import { ConfigImage } from './ConfigImage';
import styles from '../pages/MyTrackingPage.module.css';
const socialNetworks = [
  { key: 'facebook', label: 'Facebook', mark: 'f' }, { key: 'instagram', label: 'Instagram', mark: 'IG' },
  { key: 'x', label: 'X', mark: 'X' }, { key: 'zalo', label: 'Zalo', mark: 'Z' }, { key: 'whatsapp', label: 'WhatsApp', mark: 'WA' }
] as const;
/** Dữ liệu minh họa chỉ dành cho preview. Không gọi API hay hiển thị dữ liệu khách thật. */
const SAMPLE_EVENTS = [
  { date: '01/10/2026 14:30', status: 'Đã giao hàng', location: 'Điểm đến' },
  { date: '30/09/2026 09:15', status: 'Đang vận chuyển', location: 'Trung tâm khai thác' },
  { date: '29/09/2026 16:00', status: 'Đã nhận hàng', location: 'Kho xuất phát' }
];
export function TrackingPreview({ config }: { config: MyTrackingConfig }) {
  const { t } = useI18n(); const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop');
  const [input, setInput] = useState('DEMO123456'); const [bill, setBill] = useState('DEMO123456');
  const social = socialNetworks.filter(network => isWebUrl(config.brand[network.key]));
  return <section className={`${styles.card} ${styles.previewCard}`}>
    <div className={styles.previewHeader}><h2>{t('Xem trước MyTracking')}</h2><SegmentedControl ariaLabel={t('Chế độ xem trước')} value={mode} onChange={setMode} options={[{ value: 'desktop', label: 'Desktop' }, { value: 'mobile', label: 'Mobile' }]} /></div>
    <p className={styles.sampleNote}>{t('Dữ liệu tracking mẫu · chỉ để xem trước')}</p>
    <div className={styles.previewViewport}><div className={`${styles.previewPage} ${mode === 'mobile' ? styles.mobile : ''}`}>
      {config.background && <div className={styles.backdrop} aria-hidden="true"><ConfigImage src={config.background} alt="" className={styles.backgroundImage} /></div>}
      <div className={styles.trackingShell}>
        <header className={styles.brandHeader}>
          {config.brand.logo ? <ConfigImage src={config.brand.logo} alt="Logo" className={styles.logo} /> : <span className={styles.neutralLogo}><Icon name="box" size={28} /></span>}
          <div className={styles.brandInfo}><strong>{config.brand.companyName || t('Tên công ty của bạn')}</strong><p>{config.brand.address || t('Địa chỉ công ty')}</p><p>{config.brand.phone || t('Số điện thoại liên hệ')}</p></div>
        </header>
        <div className={styles.trackingColumns}>
            <form className={styles.trackingSearch} onSubmit={e => { e.preventDefault(); if (input.trim()) setBill(input.trim()); }}>
              <label htmlFor="mytracking-demo-number">Tracking number</label><input id="mytracking-demo-number" value={input} onChange={e => setInput(e.target.value)} />
              <div className={styles.demoButtons}><button type="submit" disabled={!input.trim()}>Track</button><button type="button" onClick={() => { setInput('DEMO123456'); setBill('DEMO123456'); }}>Home</button></div>
            </form>
          <main className={styles.trackingMain}>
            <h3 className={styles.blackBar}>TRACKING DETAIL</h3>
            <dl className={styles.summary}><div><dt>Tracking number</dt><dd>{bill}</dd></div><div><dt>{t('Trạng thái')}</dt><dd>{t('Đã giao hàng')}</dd></div></dl>
            <ol className={styles.timeline}>{SAMPLE_EVENTS.map(event => <li key={event.date}><span className={styles.dot} /><div><strong>{t(event.status)}</strong><p>{event.date}</p><p>{t(event.location)}</p></div></li>)}</ol>
          </main>
          <aside className={styles.advertisingPanel}>
            <h3 className={styles.promotionTitle}>{config.title}</h3>{config.description && <p className={styles.description}>{config.description}</p>}
            {config.images.length ? config.images.map(image => isWebUrl(image.linkUrl)
              ? <a key={image.id} href={image.linkUrl} target="_blank" rel="noreferrer"><ConfigImage src={image.src} alt={t('Hình ảnh quảng cáo')} className={styles.adImage} /></a>
              : <ConfigImage key={image.id} src={image.src} alt={t('Hình ảnh quảng cáo')} className={styles.adImage} />)
              : <div className={styles.neutralAd}><Icon name="image" size={30} /><span>{t('Hình ảnh quảng cáo')}</span></div>}
          </aside>
          <div className={styles.connect}><strong>Connect with us</strong><div className={styles.socialIcons}>{social.length ? social.map(network => <a key={network.key} href={config.brand[network.key]} target="_blank" rel="noreferrer" aria-label={network.label}>{network.mark}</a>) : <span className={styles.hint}>{t('Thêm link mạng xã hội để hiển thị tại đây')}</span>}</div></div>
        </div>
      </div>
      <nav className={styles.floatingContacts} aria-label={t('Liên hệ')}>
        {config.brand.phone.replace(/[^\d+]/g, '') && <a href={`tel:${config.brand.phone.replace(/[^\d+]/g, '')}`} aria-label={t('Số điện thoại')}><Icon name="phone" size={16} /></a>}
        {social.map(network => <a key={network.key} href={config.brand[network.key]} target="_blank" rel="noreferrer" aria-label={network.label}>{network.mark}</a>)}
        {!config.brand.phone && !social.length && <span aria-label={t('Liên hệ')}><Icon name="help" size={16} /></span>}
      </nav>
    </div></div>
  </section>;
}
