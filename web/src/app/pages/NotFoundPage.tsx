import { Card, EmptyState, LinkButton } from '@/shared/ui';

export function NotFoundPage() {
  return (
    <Card>
      <EmptyState title="Không tìm thấy trang" description="Đường dẫn không tồn tại hoặc đã được đổi." action={<LinkButton to="/orders">Về Đơn hàng của tôi</LinkButton>} />
    </Card>
  );
}
