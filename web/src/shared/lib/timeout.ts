/** Promise không xong trong `ms` → reject bằng lỗi do `onTimeout` tạo (request vẫn chạy tiếp, chỉ không chờ nữa). */
export function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(onTimeout()), ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); }
    );
  });
}
