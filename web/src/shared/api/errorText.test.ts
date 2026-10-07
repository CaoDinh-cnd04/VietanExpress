import { describe, expect, it } from 'vitest';
import { isNotImplemented, NOT_READY_MESSAGE, toError } from './http';

describe('toError', () => {
  it('ưu tiên câu báo lỗi của backend — 404 có message là lỗi thật, không phải "chưa có chức năng"', () => {
    const notFound = toError(404, 'Không tìm thấy đơn 123');
    expect(notFound.message).toBe('Không tìm thấy đơn 123');
    expect(isNotImplemented(notFound)).toBe(false);
    expect(toError(400, 'Thiếu tên người nhận').message).toBe('Thiếu tên người nhận');
  });

  it('404 / 501 không kèm message = backend chưa có chức năng', () => {
    for (const status of [404, 501]) {
      const e = toError(status);
      expect(e.message).toBe(NOT_READY_MESSAGE);
      expect(isNotImplemented(e)).toBe(true);
    }
  });

  it('lỗi khác không có message thì báo mã lỗi', () => {
    expect(toError(500).message).toBe('Lỗi máy chủ (500)');
    expect(isNotImplemented(toError(500))).toBe(false);
  });
});
