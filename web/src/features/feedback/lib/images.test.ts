import { describe, expect, it } from 'vitest';
import { addImages, averageRating, formatSize } from './images';

const file = (name: string, size = 1000, type = 'image/png') => ({ name, size, type });

describe('addImages', () => {
  it('nhận ảnh hợp lệ, bỏ trùng', () => {
    const r = addImages([file('a.png')], [file('a.png'), file('b.jpg', 2000, 'image/jpeg')]);
    expect(r.files.map(f => f.name)).toEqual(['a.png', 'b.jpg']);
    expect(r.errors).toEqual([]);
  });

  it('bỏ file không phải ảnh, quá 5 MB, và phần vượt 5 ảnh', () => {
    const r = addImages(
      [file('1'), file('2'), file('3'), file('4')],
      [file('x.pdf', 10, 'application/pdf'), file('big.png', 6 * 1024 * 1024), file('5'), file('6')]
    );
    expect(r.files).toHaveLength(5);
    expect(r.errors).toEqual(['Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF', 'Mỗi ảnh tối đa 5 MB', 'Tối đa {max} ảnh cho mỗi góp ý']);
  });
});

describe('formatSize', () => {
  it('KB / MB', () => {
    expect(formatSize(350 * 1024)).toBe('350 KB');
    expect(formatSize(1.25 * 1024 * 1024)).toBe('1.3 MB');
  });
});

describe('averageRating', () => {
  it('trung bình các góp ý có chấm, bỏ góp ý không chấm', () => {
    expect(averageRating([{ rating: 5 }, { rating: 4 }, { rating: null }, {}])).toEqual({ average: 4.5, count: 2 });
    expect(averageRating([{ rating: 5 }, { rating: 4 }, { rating: 4 }])).toEqual({ average: 4.3, count: 3 });
  });

  it('chưa ai chấm → null', () => {
    expect(averageRating([{ rating: null }])).toBeNull();
  });
});
