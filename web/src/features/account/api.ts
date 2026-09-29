import { useMutation } from '@tanstack/react-query';
import { getErrorMessage, http } from '@/shared/api/http';
import { useToast } from '@/shared/ui';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Đổi mật khẩu tài khoản đang đăng nhập. Endpoint mới — xem API_CONTRACT.md. */
export function useChangePassword() {
  const toast = useToast();
  return useMutation({
    mutationFn: (body: ChangePasswordRequest) => http.post<{ message: string }>('/auth/change-password', body),
    onSuccess: res => toast.show(res.message, 'success'),
    onError: e => toast.show(getErrorMessage(e), 'error')
  });
}
