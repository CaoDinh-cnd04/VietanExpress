import { z } from 'zod';

/** Số điện thoại VN: 9–11 chữ số, cho phép +84, khoảng trắng, dấu chấm, gạch nối. */
const PHONE_PATTERN = /^\+?[\d\s.-]{9,15}$/;

/** Form "Gửi tin nhắn" ở phần Liên hệ — POST /public/contact. */
export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Nhập họ tên').max(100, 'Tối đa 100 ký tự'),
  phone: z.string().trim().regex(PHONE_PATTERN, 'Số điện thoại không hợp lệ'),
  email: z.union([z.literal(''), z.email('Email không hợp lệ')]),
  message: z.string().trim().min(10, 'Nội dung tối thiểu 10 ký tự').max(2000, 'Tối đa 2000 ký tự')
});

export type ContactRequest = z.infer<typeof contactSchema>;
