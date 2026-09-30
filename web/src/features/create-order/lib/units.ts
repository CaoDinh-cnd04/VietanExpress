/** Đơn vị tính (ĐVT) có sẵn để chọn — theo hệ thống cũ. */
export const PRESET_UNITS = ['PCS', 'SET', 'BOX', 'Bag'] as const;
/** Lựa chọn "Khác": khách tự nhập ĐVT. */
export const OTHER_UNIT = 'Khác';
export const DEFAULT_UNIT = 'PCS';
/** Độ dài tối đa ĐVT khách tự nhập. */
export const UNIT_MAX = 20;

const findPreset = (unit: string) => PRESET_UNITS.find(u => u.toUpperCase() === unit.trim().toUpperCase());

/** Giá trị ô chọn ĐVT: đơn vị có sẵn, hoặc "Khác" khi khách tự nhập (kể cả đang để trống). */
export function unitChoice(unit: string): string {
  return findPreset(unit) ?? OTHER_UNIT;
}

/** Chuẩn hóa ĐVT (vd khi nhập từ file): trùng đơn vị có sẵn thì viết đúng chuẩn, trống thì PCS, còn lại giữ chữ khách nhập. */
export function normalizeUnit(raw: string | undefined): string {
  const unit = (raw ?? '').trim();
  if (!unit) return DEFAULT_UNIT;
  return findPreset(unit) ?? unit.slice(0, UNIT_MAX);
}
