import { EXPORT_TYPES, invoiceTotal, summarizePackages, type CreateOrderValues } from '@/features/create-order';

export type DetailRows = ReadonlyArray<[label: string, value: string]>;

export interface DraftDetail {
  isDoc: boolean;
  shipper: DetailRows;
  receiver: DetailRows;
  shipment: DetailRows;
  packages: ReadonlyArray<{ qty: string; packaging: string; size: string; weight: string }>;
  packageTotals: ReturnType<typeof summarizePackages> | null;
  items: ReadonlyArray<{ desc: string; hs: string; origin: string; qty: string; price: string; amount: number }>;
  invoice: DetailRows;
  invoiceTotal: number;
  currency: string;
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const orDash = (v: unknown) => text(v) || '—';
const join = (...parts: unknown[]) => parts.map(text).filter(Boolean).join(', ');
const num = (v: unknown) => {
  const n = Number(text(v));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Dựng nội dung "Xem chi tiết" từ form đã lưu cùng đơn nháp (payload của GET /drafts).
 * Nháp cũ có thể thiếu trường → hiển thị "—", không lỗi.
 */
export function draftDetail(payload: unknown): DraftDetail {
  const v = (payload ?? {}) as Partial<CreateOrderValues>;
  const s = v.shipper ?? ({} as Partial<CreateOrderValues['shipper']>);
  const r = v.receiver ?? ({} as Partial<CreateOrderValues['receiver']>);
  const sv = v.service ?? ({} as Partial<CreateOrderValues['service']>);
  const sh = v.shipment ?? ({} as Partial<CreateOrderValues['shipment']>);
  const g = v.goods ?? ({} as Partial<CreateOrderValues['goods']>);
  const inv = v.invoice ?? ({} as Partial<CreateOrderValues['invoice']>);
  const isDoc = sh.type === 'DOC';
  const currency = text(inv.currency) || 'USD';

  const packages = isDoc ? [] : (v.packages ?? []).filter(p => text(p.qty) || text(p.weight) || text(p.length));
  const items = isDoc ? [] : (inv.items ?? []).filter(it => text(it.descEn));
  const exportType = EXPORT_TYPES.find(t => t.value === inv.exportType)?.label ?? text(inv.exportType);

  return {
    isDoc,
    shipper: [
      ['Công ty / người gửi', orDash(s.company)],
      ['Người liên hệ', orDash(s.contact)],
      ['Điện thoại', orDash(s.tel)],
      ['Địa chỉ lấy hàng', orDash(s.address)],
      ['MST / CCCD', orDash(s.taxId)],
      ['Email', orDash(s.email)],
      ['Chi nhánh gửi', orDash(s.branch)]
    ],
    receiver: [
      ['Công ty', orDash(r.company)],
      ['Người liên hệ', orDash(r.contact)],
      ['Điện thoại', text(r.tel) ? `${text(r.phoneCode)} ${text(r.tel)}`.trim() : '—'],
      ['Địa chỉ', join(r.addr1, r.addr2, r.addr3) || '—'],
      ['Thành phố / bang / mã bưu chính', join(r.city, r.state, r.postal) || '—'],
      ['Nước đến', orDash(r.country)],
      ['Tax ID', orDash(r.taxId)],
      ['Email', orDash(r.email)]
    ],
    shipment: [
      ['Dịch vụ', orDash(sv.hub || sv.carrier)],
      ['Số tham chiếu', orDash(sv.reference)],
      ['Loại hàng', isDoc ? 'Chứng từ (DOC)' : 'Hàng hóa (PACK)'],
      ['Số kiện', orDash(sh.pieces)],
      ['Cân nặng', text(sh.grossWeight) ? `${text(sh.grossWeight)} kg` : '—'],
      [isDoc ? 'Nội dung chứng từ' : 'Mô tả hàng', orDash(isDoc ? g.docContent : g.description)],
      ...(!isDoc && text(g.category) ? [['Nhóm hàng', text(g.category)] as [string, string]] : []),
      ...((v.addons ?? []).length ? [['Dịch vụ thêm', (v.addons ?? []).join(', ')] as [string, string]] : [])
    ],
    packages: packages.map(p => ({
      qty: orDash(p.qty),
      packaging: orDash(p.packaging),
      size: text(p.length) ? `${text(p.length)} × ${text(p.width)} × ${text(p.height)} cm` : '—',
      weight: text(p.weight) ? `${text(p.weight)} kg` : '—'
    })),
    packageTotals: packages.length ? summarizePackages(packages) : null,
    items: items.map(it => ({
      desc: text(it.descVi) ? `${text(it.descEn)} (${text(it.descVi)})` : text(it.descEn),
      hs: orDash(it.hs),
      origin: orDash(it.origin),
      qty: `${text(it.qty)} ${text(it.unit)}`.trim(),
      price: text(it.price),
      amount: Math.round(num(it.qty) * num(it.price) * 100) / 100
    })),
    invoice: isDoc
      ? []
      : [
          ['Hình thức xuất khẩu', exportType || '—'],
          ['Tiền tệ', currency],
          ['Shipping fee', text(inv.shippingFee) ? `${text(inv.shippingFee)} ${currency}` : '—']
        ],
    invoiceTotal: invoiceTotal(items),
    currency
  };
}
