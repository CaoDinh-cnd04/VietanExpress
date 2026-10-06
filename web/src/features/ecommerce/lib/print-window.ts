/**
 * In 1 tài liệu HTML qua iframe ẩn (không mở tab mới, không bị chặn popup). Gỡ iframe sau khi hộp thoại in đóng.
 * Không phải hàm thuần — nội dung HTML do `buildPrintHtml` (có test) tạo.
 */
export function printHtml(html: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);

  const win = frame.contentWindow;
  if (!win) {
    frame.remove();
    return;
  }
  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  win.addEventListener('afterprint', cleanup);
  frame.onload = () => {
    win.focus();
    win.print();
  };
  frame.srcdoc = html;
}
