import { Navigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/shared/i18n';
import { Card, PageHeader, Tabs } from '@/shared/ui';
import { EcomAddOrder } from '../components/EcomAddOrder';
import { EcomConnect } from '../components/EcomConnect';
import { EcomOrderList } from '../components/EcomOrderList';
import { ECOM_ORDERS_PATH, resolveEcomTab, type EcomTab } from '../lib/store-connection';

const TABS: ReadonlyArray<{ key: EcomTab; label: string }> = [
  { key: 'orders', label: 'Đơn hàng' },
  { key: 'add', label: 'Thêm đơn' },
  { key: 'connect', label: 'Kết nối' }
];

/** E-commerce: đơn mới về (chờ xác nhận gửi), thêm đơn, kết nối sàn. Đơn đã xác nhận gửi ở trang riêng "Đơn hàng E-com". */
export default function EcommercePage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  // Tab cũ "Đơn hàng của tôi" đã thành trang riêng trên menu.
  if (params.get('tab') === 'mine') return <Navigate to={ECOM_ORDERS_PATH} replace />;
  const tab = resolveEcomTab(params.get('tab'));

  return (
    <>
      <PageHeader title="E-commerce" description="Kết nối Shopify, TikTok Shop để đơn tự về và tracking tự trả lên sàn, hoặc thêm đơn bằng file Excel." />
      <div className="page-stack">
        <Card flush>
          <Tabs ariaLabel={t('Chức năng E-commerce')} items={TABS} value={tab} onChange={k => setParams({ tab: k }, { replace: true })} />
        </Card>
        {tab === 'orders' && <EcomOrderList scope="inbox" />}
        {tab === 'add' && <EcomAddOrder />}
        {tab === 'connect' && <EcomConnect />}
      </div>
    </>
  );
}
