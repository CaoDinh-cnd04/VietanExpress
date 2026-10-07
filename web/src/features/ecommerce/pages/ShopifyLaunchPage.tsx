import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, getErrorMessage } from '@/shared/api/http';
import { useI18n } from '@/shared/i18n';
import { Card, EmptyState } from '@/shared/ui';
import { useClaimShopifyInstall } from '../api';

const CONNECT_TAB = '/ecommerce?tab=connect';

/**
 * Cài app từ Shopify: backend làm OAuth ngay khi Shopify mở app (/api/v1/ecom/shopify/launch), giữ token trong cookie
 * rồi chuyển về trang này. RequireAuth bắt đăng nhập trước; trang gắn shop vào tài khoản rồi về tab Kết nối.
 */
export default function ShopifyLaunchPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const claim = useClaimShopifyInstall();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    claim.mutate(undefined, {
      onSuccess: () => void navigate(`${CONNECT_TAB}&connected=shopify`, { replace: true }),
      // Không có shop chờ (mở lại link cũ, cookie hết hạn) → về tab Kết nối như bình thường.
      onError: e => { if (e instanceof ApiError && e.code === 'ECOM_INSTALL_NOT_FOUND') void navigate(CONNECT_TAB, { replace: true }); }
    });
  }, [claim, navigate]);

  return (
    <Card>
      {claim.isError
        ? <EmptyState title="Chưa kết nối được cửa hàng Shopify" description={getErrorMessage(claim.error)}
            action={<Link to={CONNECT_TAB}>{t('Mở trang Kết nối')}</Link>} />
        : <EmptyState title="Đang kết nối cửa hàng Shopify…" description="Đang gắn cửa hàng vừa cài vào tài khoản của bạn." />}
    </Card>
  );
}
