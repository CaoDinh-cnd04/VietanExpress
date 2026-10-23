import { usePrintDocuments } from '@/features/orders/mutations';
import { usePrintDraft } from '../api';

/**
 * "In & cấp bill": backend cấp mã bill + khóa đơn, rồi mở luôn bản in vận đơn khổ A4.
 * Tab in được mở ngay lúc bấm (tránh bị chặn pop-up); cấp mã lỗi thì tab tự đóng, lỗi báo qua toast của usePrintDraft.
 */
export function useIssueAndPrint() {
  const issue = usePrintDraft();
  const printDocuments = usePrintDocuments();

  /**
   * <paramref>getId</paramref>: id đơn có sẵn, hoặc hàm lưu đơn trước rồi trả id (Tạo đơn & in bill) — chạy sau khi đã mở tab in.
   * onDone: cấp bill xong; onFail: lưu / cấp bill lỗi (tab in tự đóng).
   */
  const run = (getId: string | (() => Promise<string>), onDone?: () => void, onFail?: () => void) =>
    void printDocuments(
      () =>
        (typeof getId === 'string' ? Promise.resolve(getId) : getId())
          .then(id => issue.mutateAsync(id))
          .then(res => {
            onDone?.();
            return res.billCode ? [res.billCode] : [];
          })
          .catch(() => {
            onFail?.();
            return [];
          }),
      'bill-a4'
    );

  return { run, isPending: issue.isPending, pendingId: issue.isPending ? issue.variables : undefined };
}
