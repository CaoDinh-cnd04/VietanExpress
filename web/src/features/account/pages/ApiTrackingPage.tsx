import { useState } from 'react';
import { TRACKING_URL, trackingLink } from '@/shared/config/domain';
import { useCopyToClipboard } from '@/shared/lib/useCopyToClipboard';
import { Button, Card, Icon, LinkButton, Notice, PageHeader, TextField } from '@/shared/ui';
import styles from './account.module.css';

const embedCode = (brand: boolean) =>
  `<form action="${TRACKING_URL}" method="get" target="_blank">
  <input name="id" placeholder="Nhập mã vận đơn" required />
  ${brand ? '<input type="hidden" name="brand" value="1" />\n  ' : ''}<button type="submit">Tra cứu</button>
</form>`;

/** Hướng dẫn gắn link / ô tra cứu vận đơn vào website của shop, đối tác. */
export default function ApiTrackingPage() {
  const copy = useCopyToClipboard();
  const [bill, setBill] = useState('');
  const [brand, setBrand] = useState(false);
  const link = trackingLink(bill.trim() || '{MA_BILL}', brand);

  return (
    <>
      <PageHeader
        title="API Tracking"
        description="Gắn link hoặc ô tra cứu vận đơn Việt An vào website, tin nhắn gửi khách."
        actions={<LinkButton to="/ecommerce?tab=conn" size="sm"><Icon name="key" size={15} /> API key tạo đơn</LinkButton>}
      />
      <div className="page-stack">
        <Card title="1. Link tra cứu cho từng đơn">
          <div className={styles.row}>
            <TextField label="Mã VA Bill" placeholder="VD 6156979" value={bill} onChange={e => setBill(e.target.value)} />
            <label className={styles.check}>
              <input type="checkbox" checked={brand} onChange={e => setBrand(e.target.checked)} />
              Hiển thị theo thương hiệu đại lý (Your Track)
            </label>
          </div>
          <div className={styles.linkBox}>
            <code>{link}</code>
            <Button size="sm" onClick={() => void copy(link, 'Đã sao chép link tra cứu')}><Icon name="copy" size={15} /> Sao chép</Button>
            {bill.trim() && <a className={styles.open} href={link} target="_blank" rel="noreferrer">Mở thử</a>}
          </div>
          <p className={styles.hint}>Thay <code>{'{MA_BILL}'}</code> bằng mã bill thật khi gửi cho khách (SMS, email, tin nhắn sàn).</p>
        </Card>

        <Card title="2. Ô tra cứu trên website của bạn">
          <p className={styles.hint}>Dán đoạn HTML dưới đây vào trang web; khách nhập mã bill và bấm Tra cứu sẽ mở trang theo dõi của Việt An.</p>
          <pre className={styles.code}>{embedCode(brand)}</pre>
          <Button size="sm" onClick={() => void copy(embedCode(brand), 'Đã sao chép mã nhúng')}><Icon name="copy" size={15} /> Sao chép mã nhúng</Button>
        </Card>

        <Notice title="Cần lấy trạng thái đơn qua API?">
          Dùng API key ở trang Kênh bán hàng → Kết nối &amp; API, gọi <code>GET /v1/orders/{'{bill}'}</code> hoặc đăng ký webhook để nhận cập nhật trạng thái tự động.
        </Notice>
      </div>
    </>
  );
}
