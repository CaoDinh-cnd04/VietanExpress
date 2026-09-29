/**
 * Đọc & kiểm tra file "Tạo đơn từ Excel" (lưu dạng CSV).
 * Thêm / đổi cột: sửa IMPORT_COLUMNS — file mẫu, bảng xem trước và kiểm tra tự cập nhật theo.
 */

export interface ImportColumn {
  /** Tên cột trong file mẫu (tiêu đề dòng 1). */
  header: string;
  field: keyof ImportOrderRow;
  required?: boolean;
  numeric?: boolean;
  example: string;
}

export interface ImportOrderRow {
  ref: string;
  receiverCompany: string;
  receiverContact: string;
  phone: string;
  country: string;
  city: string;
  postal: string;
  address1: string;
  address2: string;
  pieces: string;
  weightKg: string;
  content: string;
  declaredValue: string;
}

export const IMPORT_COLUMNS: readonly ImportColumn[] = [
  { header: 'RefNo', field: 'ref', example: 'PO-1001' },
  { header: 'ReceiverCompany', field: 'receiverCompany', required: true, example: 'LINEX CO. LTD' },
  { header: 'ReceiverContact', field: 'receiverContact', required: true, example: 'Mr. Lim' },
  { header: 'Phone', field: 'phone', required: true, example: '+65 8123 4567' },
  { header: 'Country', field: 'country', required: true, example: 'Singapore' },
  { header: 'City', field: 'city', required: true, example: 'Singapore' },
  { header: 'PostalCode', field: 'postal', example: '238859' },
  { header: 'Address1', field: 'address1', required: true, example: '1 Raffles Place, #20-01' },
  { header: 'Address2', field: 'address2', required: true, example: 'Tower One' },
  { header: 'Pieces', field: 'pieces', required: true, numeric: true, example: '1' },
  { header: 'WeightKg', field: 'weightKg', required: true, numeric: true, example: '2.5' },
  { header: 'Content', field: 'content', required: true, example: 'Women dress' },
  { header: 'DeclaredValueUSD', field: 'declaredValue', numeric: true, example: '40' }
];

export const ADDRESS_MAX = 30;

export interface ValidatedRow {
  /** Số dòng trong file (tính cả dòng tiêu đề) để khách dò lại. */
  line: number;
  data: ImportOrderRow;
  errors: string[];
}

export function templateRows(): string[][] {
  return [IMPORT_COLUMNS.map(c => c.header), IMPORT_COLUMNS.map(c => c.example)];
}

/** Thiếu cột bắt buộc trong tiêu đề → báo lỗi file, không xét từng dòng. */
export function missingHeaders(headers: readonly string[]): string[] {
  const have = new Set(headers.map(h => h.toLowerCase()));
  return IMPORT_COLUMNS.filter(c => c.required && !have.has(c.header.toLowerCase())).map(c => c.header);
}

export function validateRows(rows: ReadonlyArray<Record<string, string>>): ValidatedRow[] {
  return rows.map((raw, i) => {
    const lower = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.toLowerCase(), v]));
    const data = Object.fromEntries(IMPORT_COLUMNS.map(c => [c.field, (lower[c.header.toLowerCase()] ?? '').trim()])) as unknown as ImportOrderRow;
    const errors: string[] = [];
    for (const c of IMPORT_COLUMNS) {
      const v = data[c.field];
      if (c.required && !v) errors.push(`Thiếu ${c.header}`);
      else if (c.numeric && v && !(Number(v) > 0)) errors.push(`${c.header} phải là số > 0`);
    }
    if (data.address1.length > ADDRESS_MAX) errors.push(`Address1 quá ${ADDRESS_MAX} ký tự`);
    if (data.address2.length > ADDRESS_MAX) errors.push(`Address2 quá ${ADDRESS_MAX} ký tự`);
    return { line: i + 2, data, errors };
  });
}

/** Dữ liệu gửi POST /orders/batch cho một dòng hợp lệ. */
export function toBatchOrder(row: ImportOrderRow, defaults: { service: string; hub: string; branch: string }) {
  return {
    ref: row.ref,
    route: defaults.hub || defaults.service,
    service: defaults.service,
    hub: defaults.hub,
    branch: defaults.branch,
    cnee: row.receiverCompany,
    ct: row.country,
    receiver: {
      company: row.receiverCompany,
      contact: row.receiverContact,
      tel: row.phone,
      country: row.country,
      city: row.city,
      postal: row.postal,
      addr1: row.address1,
      addr2: row.address2
    },
    pcs: `${Number(row.pieces) || 1} kiện · ${Number(row.weightKg) || 0} kg`,
    content: row.content,
    declaredValue: row.declaredValue ? Number(row.declaredValue) : undefined
  };
}
