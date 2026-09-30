import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useI18n } from '@/shared/i18n';
import { Card, FormGrid, SegmentedControl, TextField } from '@/shared/ui';
import { RULES } from '../constants';
import { useFieldBinder } from '../hooks/useFieldBinder';
import type { CreateOrderValues } from '../schema';
import styles from './form.module.css';

interface ShipmentSectionProps {
  onShipmentInput: () => void;
  /** Khách tự bấm chọn loại hàng. */
  onTypeChange: () => void;
  /** PACK hiện tại do hệ thống tự chuyển từ chứng từ quá cân. */
  docConverted: boolean;
}

const TYPE_OPTIONS = [
  { value: 'DOC', label: 'Chứng từ (DOC)' },
  { value: 'PACK', label: 'Hàng hóa (PACK)' }
] as const;

export function ShipmentSection({ onShipmentInput, onTypeChange, docConverted }: ShipmentSectionProps) {
  const bind = useFieldBinder();
  const { t, lang } = useI18n();
  const { control } = useFormContext<CreateOrderValues>();
  const type = useWatch({ control, name: 'shipment.type' });
  const packageCount = useWatch({ control, name: 'packages' })?.length ?? 0;
  // Nhiều dòng kiện → tổng lấy từ bảng kiện, không sửa tay ở đây
  const derived = type === 'PACK' && packageCount > 1;

  return (
    <Card title="Thông tin đơn hàng" subtitle={lang === 'vi' ? '(Info shipment)' : undefined}>
      <div className={styles.typeRow}>
        <span className={styles.typeLabel}>{t('Loại hàng')} <span className={styles.required}>*</span></span>
        <Controller
          control={control}
          name="shipment.type"
          render={({ field }) => (
            <SegmentedControl ariaLabel="Loại hàng" options={TYPE_OPTIONS} value={field.value} onChange={v => { field.onChange(v); onTypeChange(); }} />
          )}
        />
      </div>
      <FormGrid>
        <TextField label="Số kiện" required type="number" min={1} step={1} suffix={t('kiện')} readOnly={derived} {...bind('shipment.pieces', { onChange: onShipmentInput })} />
        <TextField label="Cân nặng (gross weight)" required type="number" min={0} step={0.1} suffix="kg" readOnly={derived} {...bind('shipment.grossWeight', { onChange: onShipmentInput })} />
      </FormGrid>
      <p className={styles.hint}>
        {type === 'DOC'
          ? t('Chứng từ chỉ cần khai nội dung. Trên {kg}kg sẽ tự chuyển sang hàng hóa (PACK) và khai chi tiết kiện, Invoice.', { kg: RULES.docMaxWeightKg })
          : t(derived
            ? 'Đơn có nhiều dòng kiện — tổng được tính từ bảng kiện ở bước 2.'
            : 'Khai kích thước từng kiện ở bước 2 để tính trọng lượng quy đổi.')}
      </p>
      {docConverted && type === 'PACK' && (
        <p className={styles.notice} role="status">
          {t('Tài liệu trên {kg}kg được xem là hàng hóa. Hệ thống đã chuyển sang PACK — vui lòng khai Invoice đầy đủ.', { kg: RULES.docMaxWeightKg })}
        </p>
      )}
    </Card>
  );
}
