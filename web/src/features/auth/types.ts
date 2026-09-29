/** Khách hàng đang đăng nhập — GET /me (hồ sơ ở dbo.TCustomer). */
export interface SessionUser {
  customerCode: string;
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  defaultBranch?: string | null;
  /** Dùng để điền sẵn người gửi khi tạo đơn. */
  phone?: string | null;
  address?: string | null;
  taxCode?: string | null;
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
