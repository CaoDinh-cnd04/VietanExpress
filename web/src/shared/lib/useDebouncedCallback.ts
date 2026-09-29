import { useEffect, useMemo, useRef } from 'react';

/**
 * Trả về hàm chỉ chạy sau khi ngừng gọi `delay` ms — dùng cho ô tìm kiếm, tự lưu.
 * `.cancel()` huỷ lần gọi đang chờ (vd đã lưu xong thì không để bản tự lưu cũ ghi đè).
 */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay = 300) {
  const fnRef = useRef(fn);
  const timer = useRef<number | undefined>(undefined);
  fnRef.current = fn;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return useMemo(
    () =>
      Object.assign(
        (...args: A) => {
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => fnRef.current(...args), delay);
        },
        { cancel: () => window.clearTimeout(timer.current) }
      ),
    [delay]
  );
}
