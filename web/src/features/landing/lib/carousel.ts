/** Vị trí cuộn của carousel: `left` hiện tại, `max` = scrollWidth − clientWidth, `step` = 1 thẻ + khoảng cách. */
export interface ScrollState {
  left: number;
  max: number;
  step: number;
}

/** Sai số do trình duyệt làm tròn px (zoom, màn hình mật độ cao). */
const EPSILON = 4;

/** Tới thẻ kế tiếp; đang ở cuối thì quay về đầu. */
export function nextLeft({ left, max, step }: ScrollState): number {
  if (left >= max - EPSILON) return 0;
  return Math.min(max, left + step);
}

/** Lùi 1 thẻ; đang ở đầu thì nhảy tới cuối. */
export function prevLeft({ left, max, step }: ScrollState): number {
  if (left <= EPSILON) return max;
  return Math.max(0, left - step);
}

/** Thẻ đang ở mép trái (để tô chấm vị trí). Ở cuối thì trả thẻ cuối cùng. */
export function activeIndex({ left, max, step }: ScrollState, count: number): number {
  if (count <= 0 || step <= 0) return 0;
  if (left >= max - EPSILON) return count - 1;
  return Math.min(count - 1, Math.max(0, Math.round(left / step)));
}
