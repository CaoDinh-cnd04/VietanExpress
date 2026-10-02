import { COMPRESSED_IMAGE_BYTES, IMAGE_TYPES, MAX_IMAGE_BYTES, isWebUrl } from '../schema';

/** Check remote images without requiring the source server to support CORS. */
export function validateImageUrl(src: string): Promise<string> {
  src = src.trim();
  if (!isWebUrl(src)) return Promise.reject(new Error('Link phải bắt đầu bằng http:// hoặc https://'));
  return new Promise((resolve, reject) => {
    const image = new Image();
    const finish = (loaded: boolean) => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      if (loaded && image.naturalWidth > 0) resolve(src);
      else {
        image.src = '';
        reject(new Error('Không tải được ảnh từ URL. Vui lòng dùng link trực tiếp tới ảnh hoặc tải ảnh lên.'));
      }
    };
    const timer = setTimeout(() => finish(false), 15000);
    image.referrerPolicy = 'no-referrer';
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = src;
  });
}

export function validateImageFile(file: Pick<File, 'type' | 'size'>): void {
  if (!IMAGE_TYPES.some(type => type === file.type)) throw new Error('Chỉ nhận ảnh JPG, JPEG, PNG hoặc WebP');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Ảnh tối đa 200 KB trước khi nén');
}
function asDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Không đọc được hình ảnh'));
    reader.onerror = () => reject(new Error('Không đọc được hình ảnh'));
    reader.readAsDataURL(blob);
  });
}
/** Nén thành WebP, giảm chất lượng và kích thước để mỗi ảnh không quá 200 KB. */
export async function readImage(file: File): Promise<string> {
  validateImageFile(file);
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('Không đọc được hình ảnh'); });
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý hình ảnh');
    let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 8; attempt++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.85, 0.65, 0.45]) {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
        if (blob && blob.size <= COMPRESSED_IMAGE_BYTES) return asDataUrl(blob);
      }
      scale *= 0.75;
    }
    throw new Error('Không thể nén ảnh xuống 200 KB. Vui lòng chọn ảnh khác.');
  } finally { bitmap.close(); }
}
