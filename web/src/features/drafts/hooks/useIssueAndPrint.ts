import { usePrintDocuments } from '@/features/orders/mutations';
import { usePrintDraft } from '../api';

/**
 * "In & cấp bill": backend cấp mã bill + khóa đơn, rồi mở luôn bản in vận đơn khổ A4.
 * Tab in được mở ngay lúc bấm (tránh bị chặn pop-up); cấp mã lỗi thì tab tự đóng, lỗi báo qua toast của usePrintDraft.
 */
export function useIssueAndPrint() {
  const issue = usePrintDraft();
  const printDocuments = usePrintDocuments();

  const run = (id: string, onDone?: () => void) =>
    void printDocuments(
      () =>
        issue
          .mutateAsync(id)
          .then(res => {
            onDone?.();
            return res.billCode ? [res.billCode] : [];
          })
          .catch(() => []),
      'bill-a4'
    );

  return { run, isPending: issue.isPending, pendingId: issue.isPending ? issue.variables : undefined };
}
