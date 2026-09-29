import { useCallback, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useToast } from '@/shared/ui';
import { RULES } from '../constants';
import { applyDocWeightRule, summarizePackages, toNumber } from '../lib/shipment';
import type { CreateOrderValues } from '../schema';

const OPTS = { shouldDirty: true } as const;

/**
 * Đồng bộ "Số kiện / Cân nặng" (bước 1) với bảng kiện (bước 2):
 * - Bảng có 1 dòng: sửa ở bước 1 → cập nhật dòng kiện (cân/kiện = tổng cân / số kiện).
 * - Sửa bảng kiện → tổng ở bước 1 cập nhật theo; nhiều dòng thì ô bước 1 chỉ đọc.
 * Chạy theo sự kiện nhập (không dùng effect) để tránh vòng lặp cập nhật qua lại.
 * Đồng thời áp quy tắc chứng từ / hàng hoá theo cân (applyDocWeightRule):
 * chứng từ > 2kg tự chuyển PACK; PACK do hệ thống tự chuyển mà cân về ≤ 2kg thì trả lại chứng từ.
 */
export function useShipmentSync(form: UseFormReturn<CreateOrderValues>) {
  const { getValues, setValue } = form;
  const toast = useToast();
  /** PACK hiện tại do hệ thống tự chuyển (không phải khách chọn) — quyết định có hiện thông báo / trả lại DOC không. */
  const [autoConverted, setAutoConverted] = useState(false);

  const applyTypeRule = useCallback(
    (wasAutoConverted: boolean) => {
      const { shipment, goods } = getValues();
      const next = applyDocWeightRule({ type: shipment.type, autoConverted: wasAutoConverted }, shipment.grossWeight);
      setAutoConverted(next.autoConverted);
      if (next.change === 'toPack') {
        setValue('shipment.type', 'PACK', OPTS);
        if (goods.docContent && !goods.description) setValue('goods.description', goods.docContent, OPTS);
        toast.show(`Tài liệu trên ${RULES.docMaxWeightKg}kg được tính là hàng hóa — đã chuyển sang PACK.`);
      } else if (next.change === 'toDoc') {
        setValue('shipment.type', 'DOC', OPTS);
        if (goods.description && !goods.docContent) setValue('goods.docContent', goods.description, OPTS);
        toast.show(`Cân nặng không quá ${RULES.docMaxWeightKg}kg — đã chuyển lại chứng từ (DOC).`);
      }
    },
    [getValues, setValue, toast]
  );

  /** Khách tự bấm chọn Chứng từ / Hàng hoá: là lựa chọn chủ động, không còn là "tự chuyển". */
  const onTypeChange = useCallback(() => applyTypeRule(false), [applyTypeRule]);

  /** Gọi khi người dùng sửa Số kiện / Cân nặng ở bước 1. */
  const onShipmentInput = useCallback(() => {
    applyTypeRule(autoConverted);

    const { shipment, packages } = getValues();
    if (packages.length !== 1) return;
    const pieces = Math.max(1, Math.trunc(toNumber(shipment.pieces)));
    const gross = toNumber(shipment.grossWeight);
    setValue('packages.0.qty', String(pieces), OPTS);
    setValue('packages.0.weight', gross ? String(Math.round((gross / pieces) * 100) / 100) : '', OPTS);
  }, [applyTypeRule, autoConverted, getValues, setValue]);

  /** Gọi sau khi người dùng sửa / thêm / xóa dòng kiện. */
  const onPackagesInput = useCallback(() => {
    const summary = summarizePackages(getValues('packages'));
    setValue('shipment.pieces', String(summary.pieces || 1), OPTS);
    setValue('shipment.grossWeight', summary.grossWeight ? String(summary.grossWeight) : '', OPTS);
  }, [getValues, setValue]);

  return { onShipmentInput, onPackagesInput, onTypeChange, docConverted: autoConverted };
}
