import { useSearchParams } from 'react-router-dom';
import { useI18n } from '@/shared/i18n';
import { Card, PageHeader, Tabs } from '@/shared/ui';
import { EcomConnections } from '../components/EcomConnections';
import { EcomOrderList } from '../components/EcomOrderList';
import { EcomOverview } from '../components/EcomOverview';
import { EcomPush } from '../components/EcomPush';

const TABS = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'push', label: 'Đẩy đơn' },
  { key: 'orders', label: 'Đơn e-com' },
  { key: 'conn', label: 'Kết nối & API' }
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function EcommercePage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find(x => x.key === params.get('tab'))?.key ?? 'overview') as TabKey;

  return (
    <>
      <PageHeader title="Kênh bán hàng (E-commerce)" description="Đẩy đơn hàng loạt từ shop / sàn (TikTok Shop, Shopify, Shopee…) qua API, Excel hoặc đánh bill lẻ." />
      <div className="page-stack">
        <Card flush>
          <Tabs ariaLabel={t('Chức năng e-commerce')} items={TABS} value={tab} onChange={k => setParams({ tab: k }, { replace: true })} />
        </Card>
        {tab === 'overview' && <EcomOverview />}
        {tab === 'push' && <EcomPush />}
        {tab === 'orders' && <EcomOrderList />}
        {tab === 'conn' && <EcomConnections />}
      </div>
    </>
  );
}
