import { describe, expect, it } from 'vitest';
import { fileNameFromDisposition } from './files';

describe('fileNameFromDisposition', () => {
  it('ưu tiên filename* (UTF-8) — dạng ASP.NET Core trả về', () => {
    expect(fileNameFromDisposition(
      "attachment; filename=bang-ke.xlsx; filename*=UTF-8''b%E1%BA%A3ng-k%C3%AA.xlsx", 'x.xlsx'
    )).toBe('bảng-kê.xlsx');
  });
  it('chỉ có filename=', () => {
    expect(fileNameFromDisposition('attachment; filename="bang-ke-gui-hang-20260929.xlsx"', 'x.xlsx')).toBe('bang-ke-gui-hang-20260929.xlsx');
    expect(fileNameFromDisposition('attachment; filename=report.xlsx', 'x.xlsx')).toBe('report.xlsx');
  });
  it('không có header thì dùng tên mặc định', () => {
    expect(fileNameFromDisposition(null, 'bang-ke.xlsx')).toBe('bang-ke.xlsx');
    expect(fileNameFromDisposition('inline', 'bang-ke.xlsx')).toBe('bang-ke.xlsx');
  });
});
