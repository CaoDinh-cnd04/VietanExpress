import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, http } from '@/shared/api/http';
import { downloadBlob, fileNameFromDisposition } from '@/shared/lib/files';
import { useToast } from '@/shared/ui';
import { fetchOrdersExport, fetchPrintHtml, orderKeys } from './api';
import { PRINT_DOCUMENTS } from './constants';
import type { OrderFilters } from './types';

export type PrintDoc = (typeof PRINT_DOCUMENTS)[number]['key'];

const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : 'Có lỗi xảy ra, vui lòng thử lại');

/**
 * In chứng từ cho 1 hoặc nhiều đơn: mở tab mới NGAY khi bấm (trình duyệt không chặn pop-up),
 * tải trang in từ backend rồi đổ vào tab — trang tự mở hộp thoại in.
 */
export function usePrintDocuments() {
  const toast = useToast();
  return useCallback(
    async (bills: readonly string[], doc: PrintDoc) => {
      if (bills.length === 0) return;
      const win = window.open('', '_blank');
      if (!win) {
        toast.show('Trình duyệt đang chặn cửa sổ in — hãy cho phép pop-up cho trang này', 'error');
        return;
      }
      win.document.title = 'Đang chuẩn bị bản in…';
      win.document.body.innerHTML = '<p style="font:14px system-ui,sans-serif;padding:24px;color:#4d6456">Đang chuẩn bị bản in…</p>';
      try {
        const html = await fetchPrintHtml(bills, doc);
        win.document.open();
        win.document.write(html);
        win.document.close();
      } catch (e) {
        win.close();
        toast.show(errorMessage(e), 'error');
      }
    },
    [toast]
  );
}

/** Xuất bảng kê gửi hàng (.xlsx) theo bộ lọc đang áp dụng. */
export function useExportOrders() {
  const toast = useToast();
  return useMutation({
    mutationFn: async (filters: OrderFilters) => {
      const { blob, disposition } = await fetchOrdersExport(filters);
      downloadBlob(fileNameFromDisposition(disposition, 'bang-ke-gui-hang.xlsx'), blob);
    },
    onSuccess: () => toast.show('Đã xuất bảng kê gửi hàng', 'success'),
    onError: e => toast.show(errorMessage(e), 'error')
  });
}

export function useCancelOrder() {
  const toast = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bill: string) => http.delete<{ message: string }>(`/orders/${encodeURIComponent(bill)}`),
    onSuccess: res => {
      toast.show(res.message, 'success');
      void qc.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: e => toast.show(errorMessage(e), 'error')
  });
}
