/**
 * Tách địa chỉ người nhận theo giới hạn ký tự từng dòng (như Bill Online cũ):
 * dòng nào dài quá `max` thì cắt tại khoảng trắng gần nhất trong `max` ký tự, phần thừa dồn xuống đầu dòng sau.
 * Không có khoảng trắng thì cắt cứng ở `max`. Dòng cuối không có chỗ dồn thì giữ nguyên (form báo quá dài).
 */
export function splitAddressLines(lines: readonly string[], max: number): { lines: string[]; overflowFrom: number | null } {
  const out = [...lines];
  let overflowFrom: number | null = null;
  for (let i = 0; i < out.length - 1; i++) {
    const line = out[i] ?? '';
    if (line.length <= max) continue;
    const space = line.lastIndexOf(' ', max);
    const cut = space > 0 ? space : max;
    const tail = line.slice(cut).trimStart();
    out[i] = line.slice(0, cut).trimEnd();
    const next = (out[i + 1] ?? '').trim();
    out[i + 1] = next ? `${tail} ${next}` : tail;
    overflowFrom ??= i;
  }
  return { lines: out, overflowFrom };
}
