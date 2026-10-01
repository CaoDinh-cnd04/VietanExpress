import { describe, expect, it } from 'vitest';
import type { Category } from '../api';
import { groupCategories } from './category-picker';

const c = (id: string, name: string, isFavorite = false): Category => ({ id, name, isFavorite, isOwn: false, suggestions: [] });
const list = [c('4', 'Mỹ phẩm, hóa mỹ phẩm', true), c('1', 'Quần áo, giày dép'), c('8', 'Đồ điện tử'), c('9', 'Áo dài', true)];
const names = (xs: Category[]) => xs.map(x => x.name);

describe('groupCategories', () => {
  it('tách nhóm yêu thích, giữ thứ tự', () => {
    const g = groupCategories(list, '');
    expect(names(g.favorites)).toEqual(['Mỹ phẩm, hóa mỹ phẩm', 'Áo dài']);
    expect(names(g.others)).toEqual(['Quần áo, giày dép', 'Đồ điện tử']);
  });

  it('tìm không phân biệt dấu, hoa thường', () => {
    const g = groupCategories(list, 'AO');
    expect(names(g.favorites)).toEqual(['Áo dài']);
    expect(names(g.others)).toEqual(['Quần áo, giày dép']);
    expect(names(groupCategories(list, 'do dien').others)).toEqual(['Đồ điện tử']);
  });

  it('tìm được theo tên hiển thị (bản dịch)', () => {
    const g = groupCategories(list, 'electronics', n => (n === 'Đồ điện tử' ? 'Electronics' : n));
    expect(names(g.others)).toEqual(['Đồ điện tử']);
  });
});
