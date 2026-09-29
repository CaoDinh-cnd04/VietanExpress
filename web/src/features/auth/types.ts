/** Khách hàng đang đăng nhập — GET /me. */
export interface SessionUser {
  customerCode: string;
  companyName: string;
  contactName?: string;
  email?: string;
  avatarUrl?: string;
  defaultBranch?: string;
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
