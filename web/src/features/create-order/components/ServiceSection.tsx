import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Card, FormGrid, SelectField, TextField } from '@/shared/ui';
import { CARRIER_HUBS, CARRIERS } from '../constants';
import { useFieldBinder } from '../hooks/useFieldBinder';
import type { CreateOrderValues } from '../schema';

const NO_HUBS: readonly string[] = [];

export function ServiceSection() {
  const bind = useFieldBinder();
  const { control, setValue, getValues } = useFormContext<CreateOrderValues>();
  const carrier = useWatch({ control, name: 'service.carrier' });
  const hubs = CARRIER_HUBS[carrier] ?? NO_HUBS;

  // Đổi hãng (bằng tay hoặc điền sẵn) → chọn hub đầu tiên nếu hub hiện tại không thuộc hãng mới.
  // Chạy sau render để danh sách hub mới đã có trong <select>.
  useEffect(() => {
    if (!hubs.includes(getValues('service.hub'))) setValue('service.hub', hubs[0] ?? '', { shouldDirty: true });
  }, [hubs, getValues, setValue]);

  return (
    <Card title="Dịch vụ" subtitle="(Services)">
      <FormGrid>
        <SelectField
          label="Dịch vụ"
          required
          placeholder="Chọn dịch vụ"
          options={CARRIERS}
          {...bind('service.carrier')}
        />
        <SelectField label="Hub" required placeholder="Chọn hub" options={hubs} {...bind('service.hub')} />
        <TextField label="Số tham chiếu (mã đơn hàng của bạn)" wide {...bind('service.reference')} />
      </FormGrid>
    </Card>
  );
}
