import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '@/features/auth';
import { Icon } from '@/shared/ui';
import { ContactSection } from '../components/ContactSection';
import { FloatingContact } from '../components/FloatingContact';
import { HeroPanel } from '../components/HeroPanel';
import { AboutSection, LanesSection, PortalSection, ServicesSection } from '../components/Sections';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { BRANCHES, CARRIERS, COMPANY, LANES } from '../constants';
import { yearsSince } from '../lib/company';
import { billsFromQuery } from '../lib/tracking';
import { trackingPath } from '../lib/tracking-detail';
import styles from './LandingPage.module.css';

/**
 * Trang ngoài (không cần đăng nhập): `/` mở tab tra cứu, `/login` mở tab đăng nhập.
 * Tra cứu vận đơn chuyển sang trang /tracking/MA1,MA2; link cũ `?track=` được chuyển hướng tới đó.
 */
export default function LandingPage() {
  const [params] = useSearchParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const session = useSession();
  const loggedIn = session.data?.status === 'authenticated';

  const legacyTrack = billsFromQuery(params.get('track'));

  useEffect(() => {
    document.title = `${COMPANY.name} — Chuyển phát nhanh quốc tế`;
    // Vào từ trang khác với /#muc → cuộn tới mục sau khi trang dựng xong.
    const id = window.location.hash.slice(1);
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }, []);

  const track = (bills: string[]) => void navigate(trackingPath(bills));

  const openLogin = () => {
    void navigate({ pathname: '/login', search }, { replace: true });
    document.getElementById('tra-cuu')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const stats = [
    { value: `${yearsSince(COMPANY.foundedYear)}+`, label: 'năm kinh nghiệm' },
    { value: String(BRANCHES.length), label: 'chi nhánh' },
    { value: String(LANES.length), label: 'tuyến chuyên' },
    { value: '24/7', label: 'theo dõi hành trình' }
  ];

  if (legacyTrack.length > 0) return <Navigate to={trackingPath(legacyTrack)} replace />;

  return (
    <div className={styles.page}>
      <SiteHeader onLogin={openLogin} />

      <main>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroText}>
              <span className={styles.badge}>
                <Icon name="globe" size={14} /> Chuyển phát nhanh quốc tế từ {COMPANY.foundedYear}
              </span>
              <h1 className={styles.heroTitle}>
                Gửi hàng đi nước ngoài <span className={styles.accent}>nhanh, an toàn, tiết kiệm</span>
              </h1>
              <p className={styles.heroLead}>
                Door-to-door tới hầu hết các quốc gia qua DHL, FedEx, UPS, TNT. Lấy hàng tận nơi, đóng gói miễn phí và cập nhật hành trình liên tục.
              </p>
              <dl className={styles.stats}>
                {stats.map(s => (
                  <div key={s.label}>
                    <dt>{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <HeroPanel initialBills={[]} onTrack={track} tracking={false} />
          </div>
          <div className={styles.carriers}>
            <span>Đại lý gom hàng cho các hãng</span>
            <ul>
              {CARRIERS.map(c => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </section>


        <ServicesSection />
        <LanesSection />
        <AboutSection />
        <PortalSection loggedIn={loggedIn} onLogin={openLogin} />
        <ContactSection />
      </main>

      <SiteFooter />
      <FloatingContact />
    </div>
  );
}
