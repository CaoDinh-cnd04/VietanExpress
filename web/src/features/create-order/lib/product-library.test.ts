import { describe, expect, it } from 'vitest';
import type { SavedProduct } from '../api';
import { filterProducts } from './product-library';

const p = (descEn: string, descVi: string, isFavorite = false, hs = ''): SavedProduct => ({
  id: descEn,
  descEn,
  descVi,
  manufacturer: '',
  origin: 'VN',
  hs,
  unit: 'PCS',
  price: '',
  isFavorite
});

const list = [p('T-shirt', 'Áo phông', true), p('Garment', 'Áo'), p('Dried mango', 'Xoài sấy', false, '08134090')];

describe('filterProducts', () => {
  it('không lọc thì giữ nguyên thứ tự', () => {
    expect(filterProducts(list, '', false).map(x => x.descEn)).toEqual(['T-shirt', 'Garment', 'Dried mango']);
  });

  it('tab yêu thích chỉ lấy mặt hàng đánh dấu sao', () => {
    expect(filterProducts(list, '', true).map(x => x.descEn)).toEqual(['T-shirt']);
  });

  it('tìm không phân biệt dấu, hoa thường, theo nhiều từ và mã HS', () => {
    expect(filterProducts(list, 'ao', false).map(x => x.descEn)).toEqual(['T-shirt', 'Garment']);
    expect(filterProducts(list, 'XOAI say', false).map(x => x.descEn)).toEqual(['Dried mango']);
    expect(filterProducts(list, '0813', false).map(x => x.descEn)).toEqual(['Dried mango']);
    expect(filterProducts(list, 'ao', true).map(x => x.descEn)).toEqual(['T-shirt']);
  });
});
