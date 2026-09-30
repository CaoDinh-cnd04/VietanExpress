import { z } from 'zod';
import { fill } from '@/shared/i18n';
import { isPhone, PHONE_MESSAGE } from '@/shared/lib/phone';
import { DEFAULT_SERVICE, MULTI_CATEGORY, RULES } from './constants';

/*
 * Schema form tạo đơn — nguồn duy nhất cho kiểu dữ liệu + quy tắc kiểm tra.
 * Giá trị ô nhập giữ dạng chuỗi (đúng như input HTML); đổi sang số ở lib/shipment.ts.
 */

const REQUIRED = 'Bắt buộc';
const required = (message = REQUIRED) => z.string().trim().min(1, message);
const optional = z.string().trim();
const maxLen = (max: number) => fill('Tối đa {n} ký tự', { n: max });

const isNumber = (v: string) => v.trim() !== '' && Number.isFinite(Number(v));
/** Số (dạng chuỗi) ≥ min; `integer` để bắt số nguyên. */
const numeric = (opts: { min: number; integer?: boolean; message: string }) =>
  z.string().refine(v => isNumber(v) && Number(v) >= opts.min && (!opts.integer || Number.isInteger(Number(v))), opts.message);
const optionalNumeric = z.string().refine(v => v.trim() === '' || (isNumber(v) && Number(v) >= 0), 'Số không hợp lệ');

const optionalEmail = z.union([z.literal(''), z.email('Email không hợp lệ')]);

export const packageSchema = z.object({
  qty: z.string(),
  packaging: z.string(),
  length: optionalNumeric,
  width: optionalNumeric,
  height: optionalNumeric,
  /** Cân nặng mỗi kiện (kg). */
  weight: optionalNumeric
});

export const invoiceItemSchema = z.object({
  descEn: z.string(),
  descVi: z.string(),
  manufacturer: z.string(),
  origin: z.string(),
  hs: z.string(),
  qty: z.string(),
  unit: z.string(),
  price: z.string()
});

export const createOrderSchema = z
  .object({
    shipper: z.object({
      company: required(),
      /** Tên shipper gốc — khách là đơn vị forwarder gửi hộ (dbo.MaVanDon.Ten_Khach_Cua_FWD). Nháp cũ có thể thiếu. */
      originalShipper: optional.max(RULES.originalShipperMax, maxLen(RULES.originalShipperMax)).optional(),
      contact: required(),
      tel: required().refine(isPhone, PHONE_MESSAGE),
      address: required().max(RULES.shipperAddressMax, maxLen(RULES.shipperAddressMax)),
      taxId: optional,
      email: optionalEmail,
      country: required(),
      branch: required('Chọn chi nhánh gửi')
    }),
    service: z.object({
      carrier: required('Chọn dịch vụ'),
      hub: required('Chọn hub'),
      reference: optional
    }),
    shipment: z.object({
      type: z.enum(['DOC', 'PACK']),
      pieces: numeric({ min: 1, integer: true, message: 'Số kiện tối thiểu là 1' }),
      grossWeight: numeric({ min: 0.01, message: 'Nhập cân nặng (kg)' })
    }),
    receiver: z.object({
      country: required(),
      city: required(),
      company: required(),
      contact: required(),
      tel: required().refine(isPhone, PHONE_MESSAGE),
      /** Mã điện thoại theo nước đến, vd "+1" — tự điền, lưu vào ConsigneePhoneCode. Có thể thiếu ở nháp cũ. */
      phoneCode: z.string().optional(),
      taxId: optional,
      email: optionalEmail,
      postal: optional,
      state: optional,
      addr1: required().max(RULES.receiverAddressMax, maxLen(RULES.receiverAddressMax)),
      addr2: required().max(RULES.receiverAddressMax, maxLen(RULES.receiverAddressMax)),
      addr3: optional.max(RULES.receiverAddressMax, maxLen(RULES.receiverAddressMax))
    }),
    goods: z.object({
      category: optional,
      description: optional,
      docContent: optional,
      /** Khi category = MULTI_CATEGORY: các nhóm hàng trong kiện (in bảng phân loại kèm bill). */
      multi: z.array(z.object({ category: z.string(), note: z.string() }))
    }),
    packages: z.array(packageSchema),
    addons: z.array(z.string()),
    invoice: z.object({
      exportType: z.string(),
      currency: z.string(),
      shippingFee: optionalNumeric,
      items: z.array(invoiceItemSchema)
    })
  })
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message = REQUIRED) => ctx.addIssue({ code: 'custom', path, message });

    if (v.shipment.type === 'DOC') {
      if (!v.goods.docContent.trim()) issue(['goods', 'docContent']);
      return;
    }

    // Hàng hóa (PACK): bắt buộc mô tả, chi tiết kiện và invoice
    if (!v.goods.description.trim()) issue(['goods', 'description']);
    if (v.goods.category === MULTI_CATEGORY && !v.goods.multi.length) issue(['goods', 'multi'], 'Chọn ít nhất 1 nhóm hàng');
    if (!v.packages.length) issue(['packages'], 'Cần ít nhất 1 kiện');
    v.packages.forEach((p, i) => {
      if (!isNumber(p.qty) || Number(p.qty) < 1 || !Number.isInteger(Number(p.qty))) issue(['packages', i, 'qty'], 'SL ≥ 1');
      if (!p.packaging) issue(['packages', i, 'packaging'], 'Chọn bao bì');
    });
    if (!v.invoice.exportType) issue(['invoice', 'exportType'], 'Chọn hình thức xuất khẩu');
    if (!v.invoice.currency) issue(['invoice', 'currency'], 'Chọn đơn vị tiền tệ');
    if (!v.invoice.items.length) issue(['invoice', 'items'], 'Cần ít nhất 1 mặt hàng');
    v.invoice.items.forEach((it, i) => {
      if (!it.descEn.trim()) issue(['invoice', 'items', i, 'descEn'], 'Nhập tên hàng (EN)');
      if (!isNumber(it.qty) || Number(it.qty) <= 0) issue(['invoice', 'items', i, 'qty'], 'SL > 0');
      if (!isNumber(it.price) || Number(it.price) < 0) issue(['invoice', 'items', i, 'price'], 'Nhập đơn giá');
    });
  }, {
    // Chạy cả khi ô khác còn lỗi — để lỗi mô tả hàng / kiện / invoice hiện ngay khi rời ô, không đợi sửa hết ô trên.
    when: payload => typeof payload.value === 'object' && payload.value !== null
  });

export type CreateOrderValues = z.infer<typeof createOrderSchema>;
export type PackageValues = z.infer<typeof packageSchema>;
export type InvoiceItemValues = z.infer<typeof invoiceItemSchema>;

/** Nhóm trường theo bước wizard — dùng để kiểm tra từng bước trước khi sang bước sau. */
export const STEP_FIELDS = [
  ['shipper', 'service', 'shipment', 'receiver'],
  ['goods', 'packages', 'addons'],
  ['invoice']
] as const satisfies ReadonlyArray<ReadonlyArray<keyof CreateOrderValues>>;

export const emptyPackage = (): PackageValues => ({ qty: '1', packaging: 'Thùng carton', length: '', width: '', height: '', weight: '' });
export const emptyInvoiceItem = (): InvoiceItemValues => ({ descEn: '', descVi: '', manufacturer: '', origin: 'VN', hs: '', qty: '1', unit: 'PCS', price: '' });

export const defaultValues = (): CreateOrderValues => ({
  shipper: { company: '', originalShipper: '', contact: '', tel: '', address: '', taxId: '', email: '', country: 'Vietnam', branch: 'TP.HCM' },
  service: { carrier: DEFAULT_SERVICE.carrier, hub: DEFAULT_SERVICE.hub, reference: '' },
  shipment: { type: 'PACK', pieces: '1', grossWeight: '' },
  receiver: { country: '', city: '', company: '', contact: '', tel: '', phoneCode: '', taxId: '', email: '', postal: '', state: '', addr1: '', addr2: '', addr3: '' },
  goods: { category: '', description: '', docContent: '', multi: [] },
  packages: [emptyPackage()],
  addons: [],
  invoice: { exportType: 'GIFT', currency: 'USD', shippingFee: '', items: [emptyInvoiceItem()] }
});
