import { account } from './account';
import { common } from './common';
import { createOrder } from './create-order';
import { drafts } from './drafts';
import { ecommerce } from './ecommerce';
import { landing } from './landing';
import { orders } from './orders';
import { pricing } from './pricing';
import { support } from './support';
import { start } from './start';

/**
 * Từ điển tiếng Anh: khoá = câu tiếng Việt gốc trong code, giá trị = bản tiếng Anh.
 * Khoá có {biến} dịch được cả câu đã điền số. Chia theo khu vực cho dễ tìm; test i18n kiểm tra không thiếu câu nào.
 */
export const EN: Readonly<Record<string, string>> = {
  ...common,
  ...start,
  ...createOrder,
  ...drafts,
  ...orders,
  ...account,
  ...support,
  ...pricing,
  ...ecommerce,
  ...landing
};
