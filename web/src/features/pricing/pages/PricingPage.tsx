import { useSearchParams } from 'react-router-dom';
import { Card, PageHeader, Tabs } from '@/shared/ui';
import { QuoteLookup } from '../components/QuoteLookup';
import { RateTableView } from '../components/RateTableView';
import { ServiceManager } from '../components/ServiceManager';

const TABS = [
  { key: 'lookup', label: 'Tra cứu & gợi ý' },
  { key: 'tables', label: 'Bảng giá dịch vụ' },
  { key: 'manage', label: 'Quản lý & nhập giá' }
] as const;
type TabKey = (typeof TABS)[number]['key'];

/** Giá & gợi ý dịch vụ. Tab hiện tại lưu trên URL (?tab=) để chia sẻ / quay lại đúng chỗ. */
export default function PricingPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find(t => t.key === params.get('tab'))?.key ?? 'lookup') as TabKey;

  return (
    <>
      <PageHeader title="Giá & gợi ý dịch vụ" description="So sánh giá các hãng cho lô hàng, xem và quản lý bảng giá." />
      <div className="page-stack">
        <Card flush>
          <Tabs ariaLabel="Chức năng bảng giá" items={TABS} value={tab} onChange={k => setParams({ tab: k }, { replace: true })} />
        </Card>
        {tab === 'lookup' && <QuoteLookup />}
        {tab === 'tables' && <RateTableView />}
        {tab === 'manage' && <ServiceManager />}
      </div>
    </>
  );
}
