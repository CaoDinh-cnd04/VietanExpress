/** API công khai của feature — feature khác chỉ import từ đây. */
export { useCan, useLogout, useSession } from './api';
export { LoginForm } from './components/LoginForm';
export { RequireAuth } from './components/RequireAuth';
export { RequirePermission } from './components/RequirePermission';
export { can, PERMISSIONS, type Permission } from './lib/permissions';
export { initialsOf, PORTAL_HOME } from './lib/session';
export type { AccountType, Session, SessionUser } from './types';
