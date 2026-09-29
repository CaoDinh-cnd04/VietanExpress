import { describe, expect, it } from 'vitest';
import { createOrderSchema, defaultValues, emptyInvoiceItem, emptyPackage } from '../schema';
import { applyDocWeightRule, buildDraftPayload, invoiceTotal, isDocOverweight, summarizePackages, volumetricWeight } from './shipment';

const pkg = (over: Partial<ReturnType<typeof emptyPackage>>) => ({ ...emptyPackage(), ...over });

describe('volumetricWeight', () => {
  it('D×R×C/5000 nhân số lượng', () => {
    expect(volumetricWeight(pkg({ qty: '1', length: '30', width: '20', height: '15' }))).toBe(1.8);
    expect(volumetricWeight(pkg({ qty: '2', length: '50', width: '40', height: '30' }))).toBe(24);
  });
  it('thiếu kích thước thì bằng 0', () => {
    expect(volumetricWeight(pkg({ length: '', width: '20', height: '15' }))).toBe(0);
  });
});

describe('summarizePackages', () => {
  it('cân tính cước = max(cân thực, quy đổi)', () => {
    const s = summarizePackages([
      pkg({ qty: '2', weight: '3', length: '50', width: '40', height: '30' }),
      pkg({ qty: '1', weight: '5' })
    ]);
    expect(s).toEqual({ pieces: 3, grossWeight: 11, volumetricWeight: 24, chargeableWeight: 24 });
  });
});

describe('applyDocWeightRule', () => {
  it('chứng từ ≤ 2kg giữ nguyên, > 2kg tự chuyển PACK', () => {
    expect(applyDocWeightRule({ type: 'DOC', autoConverted: false }, '2')).toEqual({ type: 'DOC', autoConverted: false, change: null });
    expect(applyDocWeightRule({ type: 'DOC', autoConverted: false }, '2.5')).toEqual({ type: 'PACK', autoConverted: true, change: 'toPack' });
  });
  it('PACK do hệ thống tự chuyển: cân giảm về ≤ 2kg thì trả lại chứng từ', () => {
    expect(applyDocWeightRule({ type: 'PACK', autoConverted: true }, '1')).toEqual({ type: 'DOC', autoConverted: false, change: 'toDoc' });
    expect(applyDocWeightRule({ type: 'PACK', autoConverted: true }, '3')).toEqual({ type: 'PACK', autoConverted: true, change: null });
  });
  it('PACK khách tự chọn thì giữ nguyên dù cân nhẹ', () => {
    expect(applyDocWeightRule({ type: 'PACK', autoConverted: false }, '1')).toEqual({ type: 'PACK', autoConverted: false, change: null });
  });
});

describe('isDocOverweight', () => {
  it('chỉ áp dụng cho DOC > 2kg', () => {
    expect(isDocOverweight('DOC', '2')).toBe(false);
    expect(isDocOverweight('DOC', '2.1')).toBe(true);
    expect(isDocOverweight('PACK', '10')).toBe(false);
  });
});

describe('invoiceTotal', () => {
  it('cộng SL × đơn giá', () => {
    expect(invoiceTotal([{ ...emptyInvoiceItem(), qty: '5', price: '8' }, { ...emptyInvoiceItem(), qty: '2', price: '1.25' }])).toBe(42.5);
  });
});

describe('createOrderSchema', () => {
  const valid = () => {
    const v = defaultValues();
    v.shipper = { ...v.shipper, company: 'ABC', contact: 'A', tel: '090', address: 'HCM' };
    v.receiver = { ...v.receiver, country: 'Singapore', city: 'Singapore', company: 'LINEX', contact: 'Lim', tel: '+65', addr1: '1 Raffles', addr2: 'Tower One' };
    v.shipment.grossWeight = '8';
    v.goods.description = 'Váy nữ';
    v.invoice.items = [{ ...emptyInvoiceItem(), descEn: 'Dress', qty: '5', price: '8' }];
    return v;
  };

  it('hợp lệ với đủ trường', () => {
    expect(createOrderSchema.safeParse(valid()).success).toBe(true);
  });

  it('bắt buộc địa chỉ 2 và giới hạn 30 ký tự', () => {
    const v = valid();
    v.receiver.addr2 = '';
    v.receiver.addr1 = 'x'.repeat(31);
    const paths = createOrderSchema.safeParse(v).error?.issues.map(i => i.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['receiver.addr2', 'receiver.addr1']));
  });

  it('PACK bắt buộc invoice; DOC thì không', () => {
    const pack = valid();
    pack.invoice.items = [emptyInvoiceItem()];
    expect(createOrderSchema.safeParse(pack).success).toBe(false);

    const doc = valid();
    doc.shipment.type = 'DOC';
    doc.goods.docContent = 'Hợp đồng';
    doc.invoice.items = [emptyInvoiceItem()];
    expect(createOrderSchema.safeParse(doc).success).toBe(true);
  });
});

describe('buildDraftPayload', () => {
  it('dùng hub làm dịch vụ và cân tính cước từ bảng kiện', () => {
    const v = defaultValues();
    v.receiver.company = 'LINEX';
    v.receiver.country = 'Singapore';
    v.goods.description = 'Váy nữ';
    v.packages = [pkg({ qty: '1', weight: '8', length: '30', width: '20', height: '15' })];
    const d = buildDraftPayload(v, 'ready');
    expect(d).toMatchObject({ stt: 'ready', cnee: 'LINEX', service: 'Chuyên tuyến - Singapore', pcs: '1 kiện · 8 kg', content: 'Váy nữ' });
  });
});
