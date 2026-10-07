import { useEffect, useRef } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { getErrorMessage } from '@/shared/api/http';
import { useI18n } from '@/shared/i18n';
import { Card, EmptyState } from '@/shared/ui';
import { useStartStoreConnection, useStoreConnections } from '../api';
import { resolveShopifyLaunch } from '../lib/store-connection';

const CONNECT_TAB = '/ecommerce?tab=connect';

/**
 * application_url của app Shopify (/ecommerce/shopify): Shopify mở trang này kèm ?shop=…&hmac=… khi chủ shop cài app
 * hoặc bấm app trong Shopify admin. Chưa đăng nhập thì RequireAuth đưa qua /login rồi quay lại đây.
 * Shop đã kết nối → vào tab Đơn hàng; chưa → chuyển sang Shopify ủy quyền ngay (backend kiểm HMAC của query).
 */
export default function ShopifyLaunchPage() {
  const { t } = useI18n();
  const { search } = useLocation();
  const stores = useStoreConnections();
  const start = useStartStoreConnection();
  const started = useRef(false);
  // Không tải được danh sách shop thì vẫn thử kết nối — backend tự cập nhật kết nối cũ nếu có.
  const launch = stores.isPending ? null : resolveShopifyLaunch(new URLSearchParams(search), stores.data ?? []);

  useEffect(() => {
    if (launch?.kind !== 'connect' || started.current) return;
    started.current = true;
    start.mutate({ platform: 'shopify', shopDomain: launch.shop, launch: search });
  }, [launch, search, start]);

  if (launch?.kind === 'invalid') return <Navigate to={CONNECT_TAB} replace />;
  if (launch?.kind === 'connected') return <Navigate to="/ecommerce" replace />;

  return (
    <Card>
      {start.isError
        ? <EmptyState title="Chưa kết nối được cửa hàng Shopify" description={getErrorMessage(start.error)}
            action={<Link to={CONNECT_TAB}>{t('Mở trang Kết nối')}</Link>} />
        : <EmptyState title="Đang kết nối cửa hàng Shopify…" description="Bạn sẽ được chuyển sang Shopify để xác nhận quyền đọc đơn hàng." />}
    </Card>
  );
}
