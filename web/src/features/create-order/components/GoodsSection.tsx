import { useFormContext, useWatch } from 'react-hook-form';
import { Card, FormGrid, SelectField, TextField } from '@/shared/ui';
import { useCategories } from '../api';
import { MULTI_CATEGORY } from '../constants';
import { useFieldBinder } from '../hooks/useFieldBinder';
import type { CreateOrderValues } from '../schema';
import { MultiCategoryTable } from './MultiCategoryTable';

/** Nội dung hàng: PACK → nhóm hàng + mô tả (có gợi ý theo nhóm); DOC → nội dung chứng từ. */
export function GoodsSection() {
  const bind = useFieldBinder();
  const { control } = useFormContext<CreateOrderValues>();
  const [type, category] = useWatch({ control, name: ['shipment.type', 'goods.category'] });
  const { data: categories = [] } = useCategories();
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

  return (
    <Card title="Nội dung hàng hóa">
      <FormGrid>
        <SelectField
          label="Nhóm hàng hóa"
          placeholder="Chọn nhóm hàng"
          options={[
            { value: MULTI_CATEGORY, label: `${MULTI_CATEGORY} (nhiều nhóm trong 1 kiện)` },
            ...[...categories].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite)).map(c => ({ value: c.name, label: c.isFavorite ? `★ ${c.name}` : c.name }))
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
    </Card>
  );
}
