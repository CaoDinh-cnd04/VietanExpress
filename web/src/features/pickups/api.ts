import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage, http, type ListResponse } from '@/shared/api/http';
import { useToast } from '@/shared/ui';

/** Lịch pickup — docs/API_CONTRACT.md §6. */
export type PickupStatus = 'wait' | 'ok';

export interface PickupBooking {
  id: string;
  /** 'yyyy-mm-dd' hoặc 'dd/mm/yyyy' */
  date: string;
  slot: string;
  pcs: number;
  st: PickupStatus;
  stx?: string;
  branch?: string;
  address?: string;
  contact?: string;
  phone?: string;
  weightKg?: number;
  note?: string;
}

export type NewPickup = Omit<PickupBooking, 'id' | 'st' | 'stx'>;

export const pickupKeys = { all: ['pickups'] as const };

export function usePickups() {
  return useQuery({
    queryKey: pickupKeys.all,
    queryFn: () => http.get<ListResponse<PickupBooking>>('/pickups').then(r => r.data)
  });
}

export function useCreatePickup() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (body: NewPickup) => http.post<{ message: string; data: PickupBooking }>('/pickups', body),
    onSuccess: res => {
      toast.show(res.message, 'success');
      void qc.invalidateQueries({ queryKey: pickupKeys.all });
    },
    onError: e => toast.show(getErrorMessage(e), 'error')
  });
}
