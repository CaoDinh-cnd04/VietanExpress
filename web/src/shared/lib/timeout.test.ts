import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTimeout } from './timeout';

describe('withTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('trả kết quả khi xong trước hạn', async () => {
    await expect(withTimeout(Promise.resolve(1), 1000, () => new Error('hết giờ'))).resolves.toBe(1);
  });

  it('giữ nguyên lỗi của promise', async () => {
    await expect(withTimeout(Promise.reject(new Error('lỗi gốc')), 1000, () => new Error('hết giờ'))).rejects.toThrow('lỗi gốc');
  });

  it('báo hết giờ khi promise treo (máy chủ không phản hồi)', async () => {
    const pending = withTimeout(new Promise<number>(() => undefined), 1000, () => new Error('hết giờ'));
    vi.advanceTimersByTime(1000);
    await expect(pending).rejects.toThrow('hết giờ');
  });
});
