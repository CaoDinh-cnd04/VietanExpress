/** Số năm hoạt động tính tới năm `now` (tối thiểu 1). */
export function yearsSince(foundedYear: number, now: Date = new Date()): number {
  return Math.max(1, now.getFullYear() - foundedYear);
}

/** Dòng bản quyền: "2013 – 2026", cùng năm thì chỉ 1 năm. */
export function copyrightRange(fromYear: number, now: Date = new Date()): string {
  const year = now.getFullYear();
  return year > fromYear ? `${fromYear} – ${year}` : String(fromYear);
}
