/** Quy tắc mật khẩu — ĐỒNG BỘ với backend (PasswordPolicy): tối thiểu 8 ký tự, có cả chữ và số. */
export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
export const PASSWORD_MESSAGE = 'Tối thiểu 8 ký tự, gồm cả chữ và số';
