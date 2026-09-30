import type { CargoType } from '@/shared/config/domain';

/** Trạng thái đơn — hợp đồng API: docs/API_CONTRACT.md §1. */
export type OrderStatus = 'wait' | 'fly' | 'nd' | 'ok' | 'late';

export interface OrderPod {
  date: string;
  time: string;
  signer: string;
}

export interface Order {
  id: string;
  seq: number;
  bill: string;
  ref: string;
  /** Mã tracking của hãng / last-mile. */
  connect?: string;
  cnee: string;
  ct: string;
  route: string;
  branch: string;
  /** 'dd/mm/yyyy hh:mm' */
  created: string;
  /** 'dd/mm/yyyy' — rỗng nếu chưa gửi. */
  sent?: string;
  type: CargoType;
  st: OrderStatus;
  /** VD '7 kiện · 164.5 kg' */
  pcs: string;
  content: string;
  pod?: OrderPod | null;
  photos: number;
}

export type OrderSearchField = 'all' | 'cnee' | 'bill' | 'ref' | 'ct';
export type SortDir = 'asc' | 'desc';
export type OrderSortField = 'seq' | 'ref' | 'bill' | 'cnee' | 'ct' | 'sent' | 'pod' | 'created';

export interface OrderFilters {
  q: string;
  searchField: OrderSearchField;
  /** "all" hoặc nhiều trạng thái cách nhau dấu phẩy, vd "wait,fly" — xem lib/multi-filter.ts. */
  status: string;
  type: CargoType | '';
  fromDate: string;
  toDate: string;
  weightFrom: string;
  weightTo: string;
  page: number;
  pageSize: number;
  sortBy: OrderSortField;
  sortDir: SortDir;
}

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    statusCounts: Record<OrderStatus | 'all', number>;
    totalPieces: number;
    totalWeight: number;
  };
}

/** Ảnh kiện chụp trên cân tại kho. */
export interface OrderPhoto {
  url: string;
  caption?: string;
  takenAt?: string;
}

/** Một mốc hành trình đơn. */
export interface OrderEvent {
  time: string;
  title: string;
  location?: string;
}

/** Thao tác trên 1 dòng đơn — trang Đơn hàng cung cấp, bảng & menu chỉ gọi. */
export interface OrderActions {
  onOpen: (order: Order) => void;
  onPhotos: (order: Order) => void;
  onTrouble: (order: Order) => void;
}

/** Người gửi đầy đủ — GET /orders/:bill. */
export interface OrderShipper {
  company: string;
  contact: string;
  tel: string;
  address: string;
  taxId: string;
  email: string;
}

/** Người nhận đầy đủ — GET /orders/:bill. */
export interface OrderReceiver {
  company: string;
  contact: string;
  tel: string;
  country: string;
  city: string;
  postal: string;
  state: string;
  addr1: string;
  addr2: string;
  addr3: string;
  taxId: string;
  email: string;
}

/** 1 dòng kiện; `weightKg` là cân 1 kiện. */
export interface OrderPackage {
  qty: number;
  packType: string;
  length: number;
  width: number;
  height: number;
  weightKg: number;
}

export interface OrderInvoiceItem {
  descEn: string;
  descVi: string;
  qty: number;
  unit: string;
  price: number;
  amount: number;
  hs: string;
  origin: string;
}

export interface OrderInvoice {
  currency: string;
  exportType: string;
  shippingFee?: number | null;
  goodsValue?: number | null;
  items: OrderInvoiceItem[];
}

/** Chi tiết 1 đơn — GET /orders/:bill (danh sách không kèm các phần này). */
export interface OrderDetail extends Order {
  shipper?: OrderShipper | null;
  receiver?: OrderReceiver | null;
  packages?: OrderPackage[] | null;
  invoice?: OrderInvoice | null;
}
