/** Giới hạn ảnh góp ý — khớp backend (Domain/Feedback.cs). */
export const FEEDBACK_LIMITS = {
  messageMax: 4000,
  contactMax: 200,
  maxImages: 5,
  imageMaxBytes: 5 * 1024 * 1024,
  imageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as readonly string[]
} as const;

/**
 * Thêm ảnh khách chọn / kéo thả / dán vào danh sách: bỏ file không phải ảnh JPG / PNG / WEBP / GIF, quá 5 MB, trùng (tên + cỡ),
 * và phần vượt 5 ảnh. Trả danh sách mới + các câu báo lỗi (chưa dịch, có thể chứa {max}). Hàm thuần — có test.
 */
export function addImages<F extends { name: string; size: number; type: string }>(current: readonly F[], incoming: readonly F[]): { files: F[]; errors: string[] } {
  const files = [...current];
  const problems = new Set<string>();
  for (const f of incoming) {
    if (!FEEDBACK_LIMITS.imageTypes.includes(f.type)) problems.add('Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF');
    else if (f.size > FEEDBACK_LIMITS.imageMaxBytes) problems.add('Mỗi ảnh tối đa 5 MB');
    else if (files.some(x => x.name === f.name && x.size === f.size)) continue;
    else if (files.length >= FEEDBACK_LIMITS.maxImages) problems.add('Tối đa {max} ảnh cho mỗi góp ý');
    else files.push(f);
  }
  return { files, errors: [...problems] };
}

/** "1,2 MB" / "350 KB". */
export function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Điểm sao trung bình của các góp ý có chấm (1 chữ số thập phân) + số góp ý có chấm; null khi chưa ai chấm. */
export function averageRating(items: ReadonlyArray<{ rating?: number | null }>): { average: number; count: number } | null {
  const rated = items.map(i => i.rating).filter((r): r is number => typeof r === 'number' && r >= 1 && r <= 5);
  if (!rated.length) return null;
  return { average: Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10, count: rated.length };
}
