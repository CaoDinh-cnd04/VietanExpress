import { COMPANY, CONTACTS, NAV, SERVICES } from '../constants';
import { copyrightRange } from '../lib/company';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <div className={styles.brand}>
            <img src="/logo.webp" alt="" width={40} height={40} />
            <span>{COMPANY.name}</span>
          </div>
          <p>Chuyển phát nhanh quốc tế door-to-door. Nhanh chóng – Chính xác – An toàn – Tiết kiệm.</p>
        </div>
        <nav aria-label="Liên kết trang">
          <h3>Khám phá</h3>
          <ul>
            {NAV.map(n => (
              <li key={n.id}>
                <a href={`#${n.id}`}>{n.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h3>Dịch vụ</h3>
          <ul>
            {SERVICES.slice(0, 4).map(s => (
              <li key={s.title}>{s.title}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Liên hệ</h3>
          <ul>
            <li>{COMPANY.address}</li>
            <li>
              Tel: <a href={CONTACTS.phone.href}>{CONTACTS.phone.label}</a>
            </li>
            <li>
              Hotline: <a href={CONTACTS.hotline.href}>{CONTACTS.hotline.label}</a>
            </li>
            <li>
              <a href={CONTACTS.email.href}>{CONTACTS.email.label}</a>
            </li>
          </ul>
        </div>
      </div>
      <div className={styles.bottom}>
        © {copyrightRange(COMPANY.copyrightFrom)} {COMPANY.legalName}
      </div>
    </footer>
  );
}
