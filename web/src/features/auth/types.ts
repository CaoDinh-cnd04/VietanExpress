/** Loại tài khoản: tài khoản chính của khách (admin) hoặc tài khoản con của nhân viên. */
export type AccountType = 'customer' | 'staff';

/** Khách hàng đang đăng nhập — GET /me (hồ sơ ở dbo.TCustomer). */
export interface SessionUser {
  userName?: string;
  /** Tên hiển thị: người liên hệ của khách, hoặc họ tên nhân viên với tài khoản con. */
  fullName?: string;
  accountType?: AccountType;
  /** true = tài khoản chính, quản lý được tài khoản nhân viên và MyTracking. */
  isAdmin?: boolean;
  /** Mã quyền (vd "shipments.create") — UI ẩn chức năng không có quyền. */
  permissions?: string[];
  customerCode: string;
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  /** SĐT, địa chỉ, MST ở dbo.TCustomer — điền sẵn người gửi khi tạo đơn. */
  phone?: string | null;
  address?: string | null;
  taxCode?: string | null;
  avatarUrl?: string | null;
  defaultBranch?: string | null;
}

/**
 * Trạng thái phiên:
 * - `authenticated`: đã đăng nhập.
 * - `anonymous`: chưa đăng nhập / hết phiên (401).
 * - `open`: backend chưa bật đăng nhập (404/501) — portal vẫn mở để thử.
 */
export type Session = { status: 'authenticated'; user: SessionUser } | { status: 'anonymous' } | { status: 'open' };

export interface LoginRequest {
  username: string;
  password: string;
  remember: boolean;
}
