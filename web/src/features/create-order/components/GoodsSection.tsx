import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useI18n } from '@/shared/i18n';
import { Button, Card, FormGrid, Icon, SelectField, TextField } from '@/shared/ui';
import { useCategories } from '../api';
import { MULTI_CATEGORY } from '../constants';
import { useFieldBinder } from '../hooks/useFieldBinder';
import type { CreateOrderValues } from '../schema';
import { CategoryManagerDialog } from './CategoryManagerDialog';
import { MultiCategoryTable } from './MultiCategoryTable';

/** Nội dung hàng: PACK → nhóm hàng + mô tả (có gợi ý theo nhóm); DOC → nội dung chứng từ. */
export function GoodsSection() {
  const bind = useFieldBinder();
  const { t } = useI18n();
  const { control, setValue } = useFormContext<CreateOrderValues>();
  const [type, category] = useWatch({ control, name: ['shipment.type', 'goods.category'] });
  const { data: categories = [] } = useCategories();
  const [managing, setManaging] = useState(false);
  const suggestions = categories.find(c => c.name === category)?.suggestions ?? [];

  if (type === 'DOC') {
    return (
      <Card title="Nội dung chứng từ">
        <FormGrid>
          <TextField label="Nội dung chứng từ" required wide placeholder="VD: Hợp đồng, hồ sơ, giấy tờ…" {...bind('goods.docContent')} />
        </FormGrid>
      </Card>
    );
  }

  // Nhóm đang chọn không còn trong danh sách (vd đã xóa / đổi tên) vẫn hiện để không mất dữ liệu đơn.
  const missing = category && category !== MULTI_CATEGORY && !categories.some(c => c.name === category);

  return (
    <Card
      title="Nội dung hàng hóa"
      actions={<Button size="sm" onClick={() => setManaging(true)}><Icon name="edit" size={15} /> {t('Thêm / sửa nhóm hàng')}</Button>}
    >
      <FormGrid>
        <SelectField
          label="Nhóm hàng hóa"
          placeholder="Chọn nhóm hàng"
          options={[
            { value: MULTI_CATEGORY, label: t('{name} (nhiều nhóm trong 1 kiện)', { name: t(MULTI_CATEGORY) }) },
            ...categories.map(c => ({ value: c.name, label: c.isFavorite ? `★ ${t(c.name)}` : t(c.name) })),
            ...(missing ? [{ value: category, label: category }] : [])
          ]}
          {...bind('goods.category')}
        />
        <TextField
          label="Mô tả sơ bộ mặt hàng chính"
          required
          list="va-goods-suggestions"
          placeholder={category ? 'Gõ để xem gợi ý theo nhóm' : 'Chọn nhóm hàng để có gợi ý'}
          {...bind('goods.description')}
        />
      </FormGrid>
      <datalist id="va-goods-suggestions">
        {suggestions.map(s => <option key={`${s.en}-${s.hs}`} value={`${s.vi} (${s.en})`} />)}
      </datalist>
      {category === MULTI_CATEGORY && <MultiCategoryTable />}

      <CategoryManagerDialog
        open={managing}
        onClose={() => setManaging(false)}
        onCreated={name => {
          if (category !== MULTI_CATEGORY) setValue('goods.category', name, { shouldDirty: true, shouldValidate: true });
        }}
        onRenamed={(from, to) => {
          if (category === from) setValue('goods.category', to, { shouldDirty: true });
        }}
      />
    </Card>
  );
}
