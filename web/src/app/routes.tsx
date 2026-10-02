import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { RequireAuth } from '@/features/auth';
import LandingPage from '@/features/landing/pages/LandingPage';
import TrackingPage from '@/features/landing/pages/TrackingPage';
import { AppShell } from './layout/AppShell';
import { NotFoundPage } from './pages/NotFoundPage';

/** Dữ liệu gắn với route — Topbar đọc `title` để hiện breadcrumb. */
export interface RouteHandle {
  title: string;
}

// Mỗi trang tách chunk riêng, chỉ tải khi mở.
const CreateOrderPage = lazy(() => import('@/features/create-order/pages/CreateOrderPage'));
const pages = {
  myTracking: lazy(() => import('@/features/mytracking/pages/MyTrackingPage')),
  orderImport: lazy(() => import('@/features/order-import/pages/OrderImportPage')),
  orders: lazy(() => import('@/features/orders/pages/OrdersPage')),
  drafts: lazy(() => import('@/features/drafts/pages/DraftsPage')),
  pickups: lazy(() => import('@/features/pickups/pages/PickupsPage')),
  pricing: lazy(() => import('@/features/pricing/pages/PricingPage')),
  ecommerce: lazy(() => import('@/features/ecommerce/pages/EcommercePage')),
  troubles: lazy(() => import('@/features/troubles/pages/TroublesPage')),
  notifications: lazy(() => import('@/features/notifications/pages/NotificationsPage')),
  support: lazy(() => import('@/features/support/pages/SupportPage')),
  apiTracking: lazy(() => import('@/features/account/pages/ApiTrackingPage')),
  password: lazy(() => import('@/features/account/pages/ChangePasswordPage'))
} satisfies Record<string, LazyExoticComponent<ComponentType>>;

/** Khai báo 1 trang: đường dẫn + tiêu đề breadcrumb. Thêm trang mới: thêm 1 dòng ở đây và 1 dòng ở nav.config.ts. */
const page = (path: string, title: string, Page: ComponentType): RouteObject => ({
  path,
  element: <Page />,
  handle: { title } satisfies RouteHandle
});

const routes: RouteObject[] = [
  // Trang ngoài (không cần đăng nhập) — tải ngay, không lazy.
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LandingPage /> },
  // Kết quả tra cứu công khai: /tracking/MA1,MA2 (?awb= chọn mã đang xem).
  { path: '/tracking/:bills?', element: <TrackingPage /> },
  // Portal: phải đăng nhập, chưa có phiên thì chuyển về /login?next=...
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      // Bỏ trang chủ riêng: link cũ /home chuyển sang Đơn hàng của tôi
      { path: 'home', element: <Navigate to="/orders" replace /> },
      { path: 'orders/new', element: <CreateOrderPage mode="wizard" />, handle: { title: 'Tạo đơn hàng' } satisfies RouteHandle },
      { path: 'orders/new/quick', element: <CreateOrderPage mode="quick" />, handle: { title: 'Tạo đơn 1 trang' } satisfies RouteHandle },
      page('orders/import', 'Tạo đơn từ Excel', pages.orderImport),
      page('orders', 'Đơn hàng của tôi', pages.orders),
      page('drafts', 'Đơn nháp & chưa in', pages.drafts),
      page('pickups', 'Đặt lịch Pickup', pages.pickups),
      page('pricing', 'Giá & gợi ý dịch vụ', pages.pricing),
      page('ecommerce', 'Kênh bán hàng', pages.ecommerce),
      page('troubles', 'Quản lý sự cố', pages.troubles),
      page('notifications', 'Thông báo', pages.notifications),
      page('help', 'Trợ giúp & Góp ý', pages.support),
      page('account/api-tracking', 'API Tracking', pages.apiTracking),
      page('account/mytracking', 'MyTracking cá nhân', pages.myTracking),
      page('account/password', 'Đổi mật khẩu', pages.password),
      { path: '*', element: <NotFoundPage />, handle: { title: 'Không tìm thấy trang' } satisfies RouteHandle }
    ]
  }
];

export const router = createBrowserRouter(routes);
