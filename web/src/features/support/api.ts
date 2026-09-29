import { useMutation } from '@tanstack/react-query';
import { getErrorMessage, http } from '@/shared/api/http';
import { useToast } from '@/shared/ui';

export interface FeedbackRequest {
  category: string;
  subject: string;
  message: string;
  contact: string;
  /** Tệp đính kèm (ảnh / chứng từ), tùy chọn. */
  attachment?: File | null;
}

/** Gửi yêu cầu hỗ trợ / góp ý. Có tệp → multipart/form-data. Endpoint mới — xem API_CONTRACT.md. */
export function useSendFeedback() {
  const toast = useToast();
  return useMutation({
    mutationFn: ({ attachment, ...fields }: FeedbackRequest) => {
      const body = new FormData();
      Object.entries(fields).forEach(([k, v]) => body.append(k, v));
      if (attachment) body.append('attachment', attachment);
      return http.post<{ message: string }>('/support/feedback', body);
    },
    onSuccess: res => toast.show(res.message, 'success'),
    onError: e => toast.show(getErrorMessage(e, 'Chưa gửi được — vui lòng gọi hotline hoặc thử lại sau'), 'error')
  });
}
