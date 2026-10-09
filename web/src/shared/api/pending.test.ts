import { describe, expect, it } from 'vitest';
import { isPendingEndpoint } from './pending';

describe('isPendingEndpoint', () => {
  it('nhận cả endpoint con và query', () => {
    expect(isPendingEndpoint('/notifications')).toBe(true);
    expect(isPendingEndpoint('/notifications/mark-all-read')).toBe(true);
    expect(isPendingEndpoint('/troubles?status=open')).toBe(true);
    expect(isPendingEndpoint('/ecom/settings/api-keys/regenerate')).toBe(true);
  });

  it('không chặn endpoint đã có', () => {
    expect(isPendingEndpoint('/ecom/stores')).toBe(false);
    expect(isPendingEndpoint('/notificationsx')).toBe(false);
    expect(isPendingEndpoint('/orders')).toBe(false);
  });
});
