/** Bỏ dấu tiếng Việt (giữ chữ hoa / thường): "Đức Anh" → "Duc Anh". Dùng cho tìm kiếm không dấu, đường dẫn, mã. */
export const stripDiacritics = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
