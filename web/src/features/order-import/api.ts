import { useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/shared/api/http';
import { orderKeys } from '@/features/orders/api';
import type { toBatchOrder } from './lib/import-rows';

export type BatchOrder = ReturnType<typeof toBatchOrder>;

/** Tạo nhiều đơn một lần (≤ 100). Đơn được cấp mã bill ngay. */
export function useBatchCreateOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orders: BatchOrder[]) => http.post<{ message?: string; data?: unknown[] }>('/orders/batch', { orders }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: orderKeys.all })
  });
}
