import { useI18n } from '@/shared/i18n';
import { Card, EmptyState, LinkButton } from '@/shared/ui';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <Card>
      <EmptyState title="Không tìm thấy trang" description="Đường dẫn không tồn tại hoặc đã được đổi." action={<LinkButton to="/orders">{t('Về Đơn hàng của tôi')}</LinkButton>} />
    </Card>
  );
}
