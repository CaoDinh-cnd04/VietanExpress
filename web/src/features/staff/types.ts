/** Tài khoản con của nhân viên — GET /account/staff (bảng tạm dbo.TaiKhoanNhanVien). */
export interface StaffAccount {
  id: number;
  userName: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  /** Mã quyền admin đã cấp, vd "shipments.view". */
  permissions: string[];
  active: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

/** Quyền admin có thể cấp — GET /account/staff/permissions. */
export interface AssignablePermission {
  code: string;
  description: string;
}

export interface StaffProfile {
  fullName: string;
  email: string | null;
  phone: string | null;
  permissions: string[];
}

export interface NewStaff extends StaffProfile {
  userName: string;
  password: string;
}

export interface StaffUpdate extends StaffProfile {
  active: boolean;
}
