import { useCallback, useEffect, useState } from 'react';
import { tourStorageKey } from './lib/tour';

const read = (key: string) => {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

const write = (key: string) => {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    /* storage bị chặn — lần sau hiện lại, không sao */
  }
};

/** Đang có hộp thoại khác mở (vd thông báo quan trọng) → chờ tắt rồi mới hiện hướng dẫn. */
const dialogOpen = () => !!document.querySelector('dialog[open]');

/**
 * Hướng dẫn lần đầu: tự mở 1 lần cho mỗi khách (nhớ trên trình duyệt), mở lại bằng start().
 * @param customerCode mã khách đang đăng nhập; chưa có (đang tải phiên) thì chưa tự mở.
 */
export function useOnboardingTour(customerCode: string | undefined) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!customerCode || read(tourStorageKey(customerCode))) return;
    let timer = 0;
    const tryOpen = () => {
      if (dialogOpen()) timer = window.setTimeout(tryOpen, 1500);
      else setOpen(true);
    };
    timer = window.setTimeout(tryOpen, 1200); // chờ trang vẽ xong menu
    return () => window.clearTimeout(timer);
  }, [customerCode]);

  const start = useCallback(() => setOpen(true), []);

  /** Đóng (xong / bỏ qua / để sau) — đều tính là đã xem, không tự hiện lại. */
  const close = useCallback(() => {
    setOpen(false);
    if (customerCode) write(tourStorageKey(customerCode));
  }, [customerCode]);

  return { open, start, close };
}
