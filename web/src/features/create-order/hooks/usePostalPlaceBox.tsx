import { SuggestionList } from '../components/SuggestionList';
import { postalOptions, type PostalOption, type PostalSuggestion } from '../lib/geo';
import { useCombobox } from './useCombobox';

/**
 * Ô mã bưu chính có gợi ý như hệ thống cũ: khách gõ → sổ "16090, Barrio San Pedro-Xochimilco"…; chọn → điền mã + thành phố.
 * Danh sách chỉ mở khi khách gõ (không bật khi form được điền sẵn từ sổ địa chỉ / nháp).
 * Đặt `list` ngay sau ô, trong 1 khung position: relative.
 */
export function usePostalPlaceBox(items: readonly PostalSuggestion[] | undefined, onPick: (option: PostalOption) => void) {
  const box = useCombobox(postalOptions(items ?? []), onPick);
  return {
    /** Gắn vào ô mã bưu chính; onChange / onBlur truyền qua bind / register để giữ sự kiện của react-hook-form. */
    inputProps: box.inputProps,
    onType: box.onType,
    onBlur: box.close,
    list:
      box.visible.length > 0 ? (
        <SuggestionList
          id={box.listId}
          label="Gợi ý mã bưu chính"
          items={box.visible.map(o => ({ key: `${o.postalCode}|${o.city}`, title: `${o.postalCode}, ${o.city}` }))}
          active={box.active}
          onPick={box.pick}
        />
      ) : null
  };
}
