/** Ký tự được phép trong số điện thoại: chữ số, khoảng trắng, + ( ) - . / (vd "+65 6545 3778/79"). */
const NOT_PHONE_CHARS = /[^\d\s+().\-/]/g;
const PHONE_ONLY = /^[\d\s+().\-/]+$/;

/** Bỏ ký tự không phải số điện thoại (chữ cái…) ngay khi khách gõ / dán. */
export const sanitizePhone = (value: string) => value.replace(NOT_PHONE_CHARS, '');

/** Hợp lệ: chỉ gồm ký tự cho phép và có ít nhất 6 chữ số. */
export const isPhone = (value: string) => PHONE_ONLY.test(value.trim()) && (value.match(/\d/g)?.length ?? 0) >= 6;

export const PHONE_MESSAGE = 'Số điện thoại chỉ gồm chữ số và + ( ) - . /, tối thiểu 6 số';
