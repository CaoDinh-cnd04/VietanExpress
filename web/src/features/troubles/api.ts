import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage, http, type ListResponse } from '@/shared/api/http';
import { useToast } from '@/shared/ui';
import type { NewTrouble, TroubleStatus, TroubleTicket } from './types';

export const troubleKeys = {
  all: ['troubles'] as const,
  detail: (id: string) => ['troubles', 'detail', id] as const
};

export function useTroubles() {
  return useQuery({
    queryKey: troubleKeys.all,
    queryFn: () => http.get<ListResponse<TroubleTicket>>('/troubles').then(r => r.data)
  });
}

/** Báo sự cố mới cho một đơn hàng. */
export function useCreateTrouble() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (body: NewTrouble) => http.post<{ message: string; data: TroubleTicket }>('/troubles', body),
    onSuccess: res => {
      toast.show(res.message, 'success');
      void qc.invalidateQueries({ queryKey: troubleKeys.all });
    },
    onError: e => toast.show(getErrorMessage(e), 'error')
  });
}

/** Khách gửi thêm thông tin / nhắc CS; có thể kèm đổi trạng thái (VD đóng ticket). */
export function useReplyTrouble() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, reply, status }: { id: string; reply: string; status?: TroubleStatus }) =>
      http.post<{ message: string; data: TroubleTicket }>(`/troubles/${encodeURIComponent(id)}/reply`, { reply, status }),
    onSuccess: res => {
      toast.show(res.message, 'success');
      void qc.invalidateQueries({ queryKey: troubleKeys.all });
    },
    onError: e => toast.show(getErrorMessage(e), 'error')
  });
}
