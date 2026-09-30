/** Ô trong bảng: chỉ số dòng / cột (theo các cột cho phép chọn). */
export interface CellPos {
  row: number;
  col: number;
}

export interface CellRange {
  r0: number;
  r1: number;
  c0: number;
  c1: number;
}

/** Vùng chữ nhật giữa ô bắt đầu và ô đang trỏ (kéo theo hướng nào cũng được). */
export function cellRange(a: CellPos, b: CellPos): CellRange {
  return { r0: Math.min(a.row, b.row), r1: Math.max(a.row, b.row), c0: Math.min(a.col, b.col), c1: Math.max(a.col, b.col) };
}

export function inRange(r: CellRange | null, row: number, col: number): boolean {
  return !!r && row >= r.r0 && row <= r.r1 && col >= r.c0 && col <= r.c1;
}

export function rangeSize(r: CellRange): number {
  return (r.r1 - r.r0 + 1) * (r.c1 - r.c0 + 1);
}

/** Dạng dán được vào Excel / Google Sheets: cột cách nhau Tab, dòng cách nhau xuống dòng. */
export function rangeToText(r: CellRange, value: (row: number, col: number) => string): string {
  const clean = (s: string) => s.replace(/[\t\r\n]+/g, ' ').trim();
  const lines: string[] = [];
  for (let row = r.r0; row <= r.r1; row++) {
    const cells: string[] = [];
    for (let col = r.c0; col <= r.c1; col++) cells.push(clean(value(row, col)));
    lines.push(cells.join('\t'));
  }
  return lines.join('\n');
}
