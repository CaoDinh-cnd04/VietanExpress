/** Sự cố — hợp đồng API: docs/API_CONTRACT.md §6. */
export type TroublePriority = 'low' | 'mid' | 'high';
export type TroubleStatus = 'new' | 'doing' | 'waitc' | 'done';

export interface TroubleTicket {
  /** VD TRB-1024 */
  id: string;
  bill: string;
  cnee: string;
  ct: string;
  type: string;
  lv: TroublePriority;
  desc: string;
  /** Người yêu cầu */
  req: string;
  contact: string;
  date: string;
  status: TroubleStatus;
  /** Phản hồi gần nhất của CS */
  reply?: string;
}

export interface NewTrouble {
  bill: string;
  cnee?: string;
  ct?: string;
  type: string;
  lv: TroublePriority;
  desc: string;
  req: string;
  contact: string;
}
