/** Ảnh đính kèm góp ý — tải qua GET /account/feedback/images/{id}. */
export interface FeedbackImage {
  id: string;
  fileName: string;
  size: number;
}

/** GET /account/feedback — góp ý khách đã gửi. */
export interface FeedbackItem {
  id: string;
  message: string;
  contact?: string | null;
  /** 1–5 sao, null = không chấm. */
  rating?: number | null;
  /** 'dd/MM/yyyy HH:mm' */
  createdAt: string;
  seen: boolean;
  images: FeedbackImage[];
}

/** GET /admin/feedback — góp ý của mọi khách (trang quản trị). */
export interface AdminFeedbackItem extends FeedbackItem {
  customerCode: string;
  companyName: string;
  userName: string;
  isStaff: boolean;
}

/** GET /admin/feedback/{id} — chi tiết 1 góp ý kèm liên hệ của khách. */
export interface AdminFeedbackDetail {
  feedback: AdminFeedbackItem;
  seenAt?: string | null;
  customerContact?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
}
