import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CARRIERS, COMPANY, CONTACTS } from '../constants';
import styles from './PrivacyPage.module.css';

const UPDATED = 'October 7, 2026';
const ADDRESS = '14 Sam Son Street, Tan Son Nhat Ward, Ho Chi Minh City, Vietnam';

/**
 * Chính sách bảo mật của app Shopify "Viet An Express" — link khai trong App Store listing (/privacy).
 * Viết tiếng Anh vì người duyệt Shopify và chủ shop quốc tế đọc; nội dung phải khớp đúng những gì app làm
 * (quyền read_orders, webhook compliance trong ShopifyWebhooks.cs).
 */
export default function PrivacyPage() {
  useEffect(() => {
    document.title = `Privacy Policy — ${COMPANY.name}`;
  }, []);

  return (
    <div className={styles.page} lang="en">
      <header className={styles.header}>
        <div className={styles.container}>
          <Link to="/" className={styles.brand}>
            <img src="/logo.webp" alt="" width={36} height={36} />
            <span>{COMPANY.legalName}</span>
          </Link>
        </div>
      </header>

      <main className={styles.container}>
        <article className={styles.article}>
          <h1>Privacy Policy</h1>
          <p className={styles.meta}>Viet An Express app for Shopify · Last updated: {UPDATED}</p>

          <p>
            This Privacy Policy describes how {COMPANY.legalName} ("Viet An Express", "we", "us") collects, uses and
            shares information when a merchant installs the Viet An Express app (the "App") on a Shopify store and
            connects it to a Viet An Express customer account.
          </p>

          <h2>1. Information we collect</h2>
          <p>When a merchant installs the App, we access the following data through the Shopify API with the <code>read_orders</code> permission:</p>
          <ul>
            <li><strong>Store information:</strong> the store's myshopify.com domain and an access token issued by Shopify.</li>
            <li>
              <strong>Order information:</strong> order number, date, status, line items (product name, SKU, quantity,
              price, weight) and order value.
            </li>
            <li>
              <strong>Buyer information contained in orders:</strong> recipient name, company, shipping address, phone
              number and email address.
            </li>
          </ul>
          <p>We do not access payment card details, and we do not collect information from visitors to the merchant's storefront.</p>

          <h2>2. How we use information</h2>
          <ul>
            <li>To display the merchant's Shopify orders in the Viet An Express customer portal.</li>
            <li>To let the merchant create international express shipments and print shipping labels, commercial invoices and waybills.</li>
            <li>To deliver shipments and provide customer support related to those shipments.</li>
            <li>To meet legal, customs and accounting obligations for shipments that are actually sent.</li>
          </ul>
          <p>We do not sell personal information and do not use it for advertising.</p>

          <h2>3. Sharing of information</h2>
          <p>
            Shipment data (sender, recipient, contents and value) is shared only for shipments the merchant chooses to
            create, and only with parties needed to deliver them: the selected carrier ({CARRIERS.join(', ')}), customs
            authorities and our delivery partners. We may also disclose information when required by law.
          </p>
          <p>
            Data is processed on servers operated by Viet An Express and its infrastructure providers. Access is
            limited to authorized staff, and Shopify access tokens are stored encrypted.
          </p>

          <h2>4. Data retention and deletion</h2>
          <ul>
            <li>
              <strong>Uninstalling the App:</strong> the store connection is disabled and the stored access token is deleted
              immediately. No further orders are received.
            </li>
            <li>
              <strong>Customer redaction:</strong> when Shopify sends a <code>customers/redact</code> request, we delete
              the buyer's personal information from the listed orders.
            </li>
            <li>
              <strong>Shop redaction:</strong> when Shopify sends a <code>shop/redact</code> request (48 hours after
              uninstall), we delete buyer personal information from all orders received from that store.
            </li>
            <li>
              <strong>Data access requests:</strong> when Shopify sends a <code>customers/data_request</code>, we
              provide the requested data to the merchant within 30 days.
            </li>
          </ul>
          <p>
            Records of shipments that were actually sent may be kept for as long as required by customs and accounting
            laws.
          </p>

          <h2>5. Your rights</h2>
          <p>
            Merchants and buyers may request access to, correction of, or deletion of their personal information by
            contacting us. Buyers can also contact the merchant they purchased from, who can submit the request through
            Shopify.
          </p>

          <h2>6. Changes to this policy</h2>
          <p>We may update this policy from time to time. The "Last updated" date above shows when it was last changed.</p>

          <h2>7. Contact us</h2>
          <address className={styles.contact}>
            {COMPANY.legalName}<br />
            {ADDRESS}<br />
            Email: <a href={CONTACTS.email.href}>{CONTACTS.email.label}</a><br />
            Phone: <a href={CONTACTS.phone.href}>+84 28 3948 3949</a>
          </address>
        </article>
      </main>
    </div>
  );
}
