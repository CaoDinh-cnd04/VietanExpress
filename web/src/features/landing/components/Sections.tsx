import { useState, type ReactNode } from 'react';
import { PORTAL_HOME } from '@/features/auth';
import { cx } from '@/shared/lib/cx';
import { Button, Icon, LinkButton, Modal } from '@/shared/ui';
import { COMPANY, CONTACTS, GALLERY, LANES, PORTAL_FEATURES, SERVICES, STEPS, VALUES } from '../constants';
import { yearsSince } from '../lib/company';
import { Carousel } from './Carousel';
import { LaneArt } from './LaneArt';
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
  return (
    <section id={id} className={cx(styles.section, tone === 'muted' && styles.muted)} aria-labelledby={`${id}-title`}>
      <div className={styles.container}>
        <header className={styles.sectionHead}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h2 id={`${id}-title`} className={styles.title}>
            {title}
          </h2>
          {lead && <p className={styles.lead}>{lead}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}

export function ServicesSection() {
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
            <h3 className={styles.cardTitle}>{s.title}</h3>
            <p className={styles.cardText}>{s.desc}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

export function LanesSection() {
  return (
    <Section
      id="tuyen"
      tone="muted"
      eyebrow="Tuyến chuyên"
      title="Giá tốt, chăm sóc kỹ trên các tuyến chủ lực"
      lead="Ngoài các tuyến dưới đây, Việt An nhận gửi đi hầu hết quốc gia qua mạng lưới hãng quốc tế."
    >
      <Carousel
        ariaLabel="Các tuyến chuyên"
        items={[
          ...LANES.map(l => ({
            key: l.code,
            node: (
              <article className={styles.lane}>
                <div className={styles.laneArt}>
                  <LaneArt code={l.code} landmark={l.landmark} />
                  <img className={styles.laneFlag} src={`/flags/${l.code.toLowerCase()}.svg`} alt={`Cờ ${l.country}`} loading="lazy" />
                </div>
                <div className={styles.laneBody}>
                  <span className={styles.laneName}>Gửi hàng đi {l.country}</span>
                  <span className={styles.laneDesc}>Việt Nam → {l.country}</span>
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
                <span className={styles.laneName}>Nước khác?</span>
                <span className={styles.laneDesc}>Gửi đi hầu hết quốc gia qua DHL, FedEx, UPS, TNT</span>
                <span className={styles.textLink}>
                  Hỏi giá ngay <Icon name="arrowRight" size={16} />
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
  const [photo, setPhoto] = useState<number | null>(null);
  const current = photo === null ? undefined : GALLERY[photo];
  const step = (delta: number) => setPhoto(p => (p === null ? p : (p + delta + GALLERY.length) % GALLERY.length));

  return (
    <Section id="ve-chung-toi" eyebrow="Về chúng tôi" title={`${yearsSince(COMPANY.foundedYear)} năm đồng hành cùng hàng Việt ra thế giới`}>
      <div className={styles.about}>
        <img className={styles.aboutPhoto} src="/landing/hero.jpg" alt="Trụ sở Việt An Express, 14 Sam Sơn, TP. Hồ Chí Minh" loading="lazy" />
        <div className={styles.aboutBody}>
          <p>
            Tham gia thị trường chuyển phát từ năm {COMPANY.foundedYear}, Việt An Express tập trung vào dịch vụ door-to-door và là đại lý gom
            hàng cho các hãng quốc tế hàng đầu tại Việt Nam như DHL, FedEx, UPS, TNT.
          </p>
          <p>
            Trụ sở tại TP. Hồ Chí Minh cùng chi nhánh Hà Nội, Cần Thơ và Bảo Lộc giúp bạn gửi hàng nhanh và thuận tiện hơn. Trạng thái bưu
            phẩm được cập nhật liên tục để bạn theo dõi mọi lúc, mọi nơi.
          </p>
          <ul className={styles.values}>
            {VALUES.map(v => (
              <li key={v.title}>
                <span className={styles.iconBox}>
                  <Icon name={v.icon} size={20} />
                </span>
                <div>
                  <strong>{v.title}</strong>
                  <p className={styles.cardText}>{v.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3 className={styles.subTitle}>Hình ảnh hoạt động</h3>
      <div className={styles.gallery}>
        {GALLERY.map((g, i) => (
          <button key={g.src} type="button" className={styles.galleryItem} onClick={() => setPhoto(i)} aria-label={`Xem ảnh: ${g.alt}`}>
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
              <Button onClick={() => step(-1)}>Ảnh trước</Button>
              <Button onClick={() => step(1)}>Ảnh sau</Button>
            </>
          }
        >
          <img className={styles.lightbox} src={current.src} alt={current.alt} />
        </Modal>
      )}
    </Section>
  );
}

export function PortalSection({ loggedIn, onLogin }: { loggedIn: boolean; onLogin: () => void }) {
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
            <strong>{s.title}</strong>
            <span className={styles.cardText}>{s.desc}</span>
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
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardText}>{f.desc}</p>
            </div>
          </article>
        ))}
      </div>
      <div className={styles.center}>
        {loggedIn ? (
          <LinkButton to={PORTAL_HOME} variant="primary" className={styles.bigButton}>
            Vào portal <Icon name="arrowRight" size={16} />
          </LinkButton>
        ) : (
          <Button variant="primary" className={styles.bigButton} onClick={onLogin}>
            Đăng nhập portal <Icon name="arrowRight" size={16} />
          </Button>
        )}
        <p className={styles.cardText}>
          Chưa có tài khoản? Gọi <a href={CONTACTS.hotline.href}>{CONTACTS.hotline.label}</a> để được cấp.
        </p>
      </div>
    </Section>
  );
}
