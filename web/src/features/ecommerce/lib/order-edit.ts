import type { EcomOrder, EcomOrderUpdate } from '../types';

/** Giá trị form sửa đơn (chuỗi để gắn thẳng vào input). */
export interface OrderEditForm {
  name: string;
  company: string;
  phone: string;
  email: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postal: string;
  countryCode: string;
  kg: string;
  note: string;
  products: Array<{ name: string; sku: string; qty: string; price: string; hsCode: string }>;
}

/** Không chứa chữ Nhật / Hàn / Trung… — nhãn hãng bay chỉ in được chữ Latin (giống OrderData.IsLatin của backend). */
export const isLatin = (text: string): boolean => [...text].every(c => c.charCodeAt(0) < 0x0250 || /\s/.test(c) || '‘’“”–—№'.includes(c));

export function toEditForm(o: EcomOrder): OrderEditForm {
  const r = o.receiver ?? {};
  return {
    name: r.name ?? o.cnee ?? '',
    company: r.company ?? '',
    phone: r.phone ?? '',
    email: r.email ?? '',
    address1: r.address1 ?? '',
    address2: r.address2 ?? '',
    city: r.city ?? '',
    state: r.state ?? '',
    postal: r.postal ?? '',
    countryCode: r.countryCode ?? '',
    kg: o.kg ? String(o.kg) : '',
    note: o.note ?? '',
    products: (o.products ?? []).map(p => ({ name: p.name, sku: p.sku, qty: String(p.qty), price: String(p.sellingPrice), hsCode: p.hsCode ?? '' }))
  };
}

/** Form → body PUT /ecom/orders/:id. Giá FOB giữ bằng giá bán (khai hải quan theo giá bán). Dịch vụ / hub / chi nhánh giữ nguyên. */
export function fromEditForm(f: OrderEditForm, o: Pick<EcomOrder, 'service' | 'hub' | 'branch'>): EcomOrderUpdate {
  const kg = Number(f.kg);
  return {
    receiver: {
      name: f.name.trim(), company: f.company.trim(), phone: f.phone.trim(), email: f.email.trim(),
      address1: f.address1.trim(), address2: f.address2.trim(), city: f.city.trim(), state: f.state.trim(),
      postal: f.postal.trim(), countryCode: f.countryCode
    },
    kg: f.kg.trim() && kg > 0 ? kg : null,
    products: f.products.map(p => ({ name: p.name.trim(), sku: p.sku.trim(), qty: Number(p.qty), fobPrice: Number(p.price), sellingPrice: Number(p.price), hsCode: p.hsCode.trim() })),
    service: o.service ?? null,
    hub: o.hub ?? null,
    branch: o.branch ?? null,
    note: f.note.trim()
  };
}
