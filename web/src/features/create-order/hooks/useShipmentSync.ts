import { useCallback, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useToast } from '@/shared/ui';
import { isDocOverweight, summarizePackages, toNumber } from '../lib/shipment';
import type { CreateOrderValues } from '../schema';

const OPTS = { shouldDirty: true } as const;

/**
 * Đồng bộ "Số kiện / Cân nặng" (bước 1) với bảng kiện (bước 2):
 * - Bảng có 1 dòng: sửa ở bước 1 → cập nhật dòng kiện (cân/kiện = tổng cân / số kiện).
 * - Sửa bảng kiện → tổng ở bước 1 cập nhật theo; nhiều dòng thì ô bước 1 chỉ đọc.
 * Chạy theo sự kiện nhập (không dùng effect) để tránh vòng lặp cập nhật qua lại.
 * Đồng thời áp DocToPackRule: chứng từ > 2kg tự chuyển sang hàng hóa.
 */
export function useShipmentSync(form: UseFormReturn<CreateOrderValues>) {
  const { getValues, setValue } = form;
  const toast = useToast();
  const [docConverted, setDocConverted] = useState(false);

  /** Gọi khi người dùng sửa Số kiện / Cân nặng ở bước 1. */
  const onShipmentInput = useCallback(() => {
    const { shipment, packages, goods } = getValues();

    if (isDocOverweight(shipment.type, shipment.grossWeight)) {
      setValue('shipment.type', 'PACK', OPTS);
      if (goods.docContent && !goods.description) setValue('goods.description', goods.docContent, OPTS);
      setDocConverted(true);
      toast.show('Tài liệu trên 2kg được tính là hàng hóa — đã chuyển sang PACK.');
    }

    if (packages.length !== 1) return;
    const pieces = Math.max(1, Math.trunc(toNumber(shipment.pieces)));
    const gross = toNumber(shipment.grossWeight);
    setValue('packages.0.qty', String(pieces), OPTS);
    setValue('packages.0.weight', gross ? String(Math.round((gross / pieces) * 100) / 100) : '', OPTS);
  }, [getValues, setValue, toast]);

  /** Gọi sau khi người dùng sửa / thêm / xóa dòng kiện. */
  const onPackagesInput = useCallback(() => {
    const summary = summarizePackages(getValues('packages'));
    setValue('shipment.pieces', String(summary.pieces || 1), OPTS);
    setValue('shipment.grossWeight', summary.grossWeight ? String(summary.grossWeight) : '', OPTS);
  }, [getValues, setValue]);

  return { onShipmentInput, onPackagesInput, docConverted };
}
