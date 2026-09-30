import { describe, expect, it } from 'vitest';
import { createTranslator } from './translate';

const t = createTranslator({
  'Tạo đơn': 'Create order',
  'Tối đa {n} ký tự': 'Max {n} characters',
  'Đã tạo {n} đơn và cấp số vận đơn': 'Created {n} orders with bill numbers',
  'Bước {i}/{n}': 'Step {i}/{n}'
});

describe('createTranslator', () => {
  it('tiếng Việt giữ nguyên, chỉ điền biến', () => {
    expect(t('vi', 'Tạo đơn')).toBe('Tạo đơn');
    expect(t('vi', 'Bước {i}/{n}', { i: 2, n: 8 })).toBe('Bước 2/8');
  });

  it('tiếng Anh: khớp nguyên câu', () => {
    expect(t('en', 'Tạo đơn')).toBe('Create order');
    expect(t('en', 'Bước {i}/{n}', { i: 2, n: 8 })).toBe('Step 2/8');
  });

  it('tiếng Anh: câu đã điền số vẫn dịch được (thông báo lỗi, máy chủ)', () => {
    expect(t('en', 'Tối đa 30 ký tự')).toBe('Max 30 characters');
    expect(t('en', 'Đã tạo 12 đơn và cấp số vận đơn')).toBe('Created 12 orders with bill numbers');
  });

  it('mẫu cụ thể hơn khớp trước mẫu ngắn', () => {
    const tr = createTranslator({ 'Kiện {n}': 'Piece {n}', 'Kiện {i}: hàng quá khổ': 'Piece {i}: oversized' });
    expect(tr('en', 'Kiện 2: hàng quá khổ')).toBe('Piece 2: oversized');
    expect(tr('en', 'Kiện 3')).toBe('Piece 3');
  });

  it('chưa có bản dịch hoặc là dữ liệu (tên khách…) → giữ nguyên', () => {
    expect(t('en', 'SCS CO., LTD')).toBe('SCS CO., LTD');
    expect(t('en', '')).toBe('');
  });
});
