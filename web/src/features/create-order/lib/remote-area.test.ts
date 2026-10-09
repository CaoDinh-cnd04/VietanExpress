import { describe, expect, it } from 'vitest';
import { remoteAreaCarriers } from './remote-area';

describe('remoteAreaCarriers', () => {
  it('ghi tier của FedEx, hãng khác chỉ tên', () => {
    expect(remoteAreaCarriers([{ carrier: 'Fedex', tier: 'Tier A' }, { carrier: 'UPS', tier: null }])).toBe('Fedex (Tier A), UPS');
  });

  it('rỗng → chuỗi rỗng', () => {
    expect(remoteAreaCarriers([])).toBe('');
  });
});
