import { useState, type ReactNode } from 'react';
import { PORTAL_HOME } from '@/features/auth';
import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { Button, Icon, LinkButton, Modal } from '@/shared/ui';
import { COMPANY, CONTACTS, GALLERY, LANES, PORTAL_FEATURES, SERVICES, STEPS, VALUES } from '../constants';
import { yearsSince } from '../lib/company';
import { Carousel } from './Carousel';
import styles from './Sections.module.css';

interface SectionProps {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  tone?: 'plain' | 'muted';
  children: ReactNode;
}

/** Khung 1 phần của trang ngoài: nhãn nhỏ + tiêu đề + mô tả + nội dung. */
export function Section({ id, eyebrow, title, lead, tone = 'plain', children }: SectionProps) {
  const { t } = useI18n();
  return (
    <section id={id} className={cx(styles.section, tone === 'muted' && styles.muted)} aria-labelledby={`${id}-title`}>
      <div className={styles.container}>
        <header className={styles.sectionHead}>
          <span className={styles.eyebrow}>{t(eyebrow)}</span>
          <h2 id={`${id}-title`} className={styles.title}>
            {t(title)}
          </h2>
          {lead && <p className={styles.lead}>{t(lead)}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}

export function ServicesSection() {
  const { t } = useI18n();
  return (
    <Section
      id="dich-vu"
      eyebrow="Dịch vụ"
      title="Giải pháp gửi hàng đi nước ngoài trọn gói"
      lead="Door-to-door từ lấy hàng, đóng gói, khai báo hải quan tới khi phát cho người nhận."
    >
      <div className={styles.grid3}>
        {SERVICES.map(s => (
          <article key={s.title} className={styles.card}>
            <span className={styles.iconBox}>
              <Icon name={s.icon} size={22} />
            </span>
            <h3 className={styles.cardTitle}>{t(s.title)}</h3>
            <p className={styles.cardText}>{t(s.desc)}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

export function LanesSection() {
  const { t } = useI18n();
  return (
    <Section
      id="tuyen"
      tone="muted"
      eyebrow="Tuyến chuyên"
      title="Giá tốt, chăm sóc kỹ trên các tuyến chủ lực"
      lead="Ngoài các tuyến dưới đây, Việt An nhận gửi đi hầu hết quốc gia qua mạng lưới hãng quốc tế."
    >
      <Carousel
        ariaLabel={t('Các tuyến chuyên')}
        items={[
          ...LANES.map(l => ({
            key: l.code,
            node: (
              <article className={styles.lane}>
                <div className={styles.laneArt}>
                  <img className={styles.lanePhoto} src={`/landing/lanes/${l.code.toLowerCase()}.jpg`} alt={t(l.landmark)} loading="lazy" width={960} height={549} />
                  <a className={styles.laneCredit} href={l.photo.source} target="_blank" rel="noreferrer" title={t(l.landmark)}>
                    {t('Ảnh: {author}', { author: l.photo.author })} · {l.photo.license}
                  </a>
                  <img className={styles.laneFlag} src={`/flags/${l.code.toLowerCase()}.svg`} alt={t('Cờ {country}', { country: t(l.country) })} loading="lazy" />
                </div>
                <div className={styles.laneBody}>
                  <span className={styles.laneName}>{t('Gửi hàng đi {country}', { country: t(l.country) })}</span>
                  <span className={styles.laneDesc}>{t('Việt Nam')} → {t(l.country)}</span>
                </div>
              </article>
            )
          })),
          {
            key: 'more',
            node: (
              <a href="#lien-he" className={cx(styles.lane, styles.laneMore)}>
                <span className={styles.laneMoreIcon}>
                  <Icon name="globe" size={32} />
                </span>
                <span className={styles.laneName}>{t('Nước khác?')}</span>
                <span className={styles.laneDesc}>{t('Gửi đi hầu hết quốc gia qua DHL, FedEx, UPS, TNT')}</span>
                <span className={styles.textLink}>
                  {t('Hỏi giá ngay')} <Icon name="arrowRight" size={16} />
                </span>
              </a>
            )
          }
        ]}
      />
    </Section>
  );
}


export function AboutSection() {
  const { t } = useI18n();
  const [photo, setPhoto] = useState<number | null>(null);
  const current = photo === null ? undefined : GALLERY[photo];
  const step = (delta: number) => setPhoto(p => (p === null ? p : (p + delta + GALLERY.length) % GALLERY.length));

  return (
    <Section id="ve-chung-toi" eyebrow="Về chúng tôi" title={t('{n} năm đồng hành cùng hàng Việt ra thế giới', { n: yearsSince(COMPANY.foundedYear) })}>
      <div className={styles.about}>
        <img className={styles.aboutPhoto} src="/landing/hero.jpg" alt={t('Trụ sở Việt An Express, 14 Sam Sơn, TP. Hồ Chí Minh')} loading="lazy" />
        <div className={styles.aboutBody}>
          <p>
            {t(
              'Tham gia thị trường chuyển phát từ năm {year}, Việt An Express tập trung vào dịch vụ door-to-door và là đại lý gom hàng cho các hãng quốc tế hàng đầu tại Việt Nam như DHL, FedEx, UPS, TNT.',
              { year: COMPANY.foundedYear }
            )}
          </p>
          <p>
            {t(
              'Trụ sở tại TP. Hồ Chí Minh cùng chi nhánh Hà Nội, Cần Thơ và Bảo Lộc giúp bạn gửi hàng nhanh và thuận tiện hơn. Trạng thái bưu phẩm được cập nhật liên tục để bạn theo dõi mọi lúc, mọi nơi.'
            )}
          </p>
          <ul className={styles.values}>
            {VALUES.map(v => (
              <li key={v.title}>
                <span className={styles.iconBox}>
                  <Icon name={v.icon} size={20} />
                </span>
                <div>
                  <strong>{t(v.title)}</strong>
                  <p className={styles.cardText}>{t(v.desc)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3 className={styles.subTitle}>{t('Hình ảnh hoạt động')}</h3>
      <div className={styles.gallery}>
        {GALLERY.map((g, i) => (
          <button key={g.src} type="button" className={styles.galleryItem} onClick={() => setPhoto(i)} aria-label={t('Xem ảnh: {name}', { name: t(g.alt) })}>
            <img src={g.src} alt="" loading="lazy" />
          </button>
        ))}
      </div>

      {current && (
        <Modal
          open
          size="lg"
          title={current.alt}
          onClose={() => setPhoto(null)}
          footer={
            <>
              <Button onClick={() => step(-1)}>{t('Ảnh trước')}</Button>
              <Button onClick={() => step(1)}>{t('Ảnh sau')}</Button>
            </>
          }
        >
          <img className={styles.lightbox} src={current.src} alt={t(current.alt)} />
        </Modal>
      )}
    </Section>
  );
}

export function PortalSection({ loggedIn, onLogin }: { loggedIn: boolean; onLogin: () => void }) {
  const { t } = useI18n();
  return (
    <Section
      id="portal"
      tone="muted"
      eyebrow="Portal khách hàng"
      title="Tự tạo đơn, in bill và theo dõi hàng 24/7"
      lead="Dành cho khách hàng doanh nghiệp và người bán hàng online gửi thường xuyên."
    >
      <ol className={styles.steps}>
        {STEPS.map((s, i) => (
          <li key={s.title} className={styles.step}>
            <span className={styles.stepNo}>{i + 1}</span>
            <strong>{t(s.title)}</strong>
            <span className={styles.cardText}>{t(s.desc)}</span>
          </li>
        ))}
      </ol>
      <div className={styles.grid3}>
        {PORTAL_FEATURES.map(f => (
          <article key={f.title} className={cx(styles.card, styles.cardRow)}>
            <span className={styles.iconBox}>
              <Icon name={f.icon} size={20} />
            </span>
            <div>
              <h3 className={styles.cardTitle}>{t(f.title)}</h3>
              <p className={styles.cardText}>{t(f.desc)}</p>
            </div>
          </article>
        ))}
      </div>
      <div className={styles.center}>
        {loggedIn ? (
          <LinkButton to={PORTAL_HOME} variant="primary" className={styles.bigButton}>
            {t('Vào portal')} <Icon name="arrowRight" size={16} />
          </LinkButton>
        ) : (
          <Button variant="primary" className={styles.bigButton} onClick={onLogin}>
            {t('Đăng nhập portal')} <Icon name="arrowRight" size={16} />
          </Button>
        )}
        <p className={styles.cardText}>
          {t('Chưa có tài khoản? Gọi')} <a href={CONTACTS.hotline.href}>{CONTACTS.hotline.label}</a> {t('để được cấp.')}
        </p>
      </div>
    </Section>
  );
}
