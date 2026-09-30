import { describe, expect, it } from 'vitest';
import { draftDetail } from './draft-detail';

const pack = {
  shipper: { company: 'SCS CO., LTD', contact: 'MR TUẤN ANH', tel: '0938061868', address: 'HCM', taxId: '', email: '', country: 'Vietnam', branch: 'TP.HCM' },
  service: { carrier: 'Chuyên tuyến', hub: 'Chuyên tuyến - Singapore', reference: 'PO-1' },
  shipment: { type: 'PACK', pieces: '2', grossWeight: '10' },
  receiver: { company: 'HONG AN DUONG', contact: 'andrew', tel: '2125550100', phoneCode: '+1', country: 'United States', city: 'New York City', state: 'New York', postal: '10002', addr1: '1 Main St', addr2: 'Apt 2', addr3: '', taxId: '', email: '' },
  goods: { category: '', description: 'Váy nữ', docContent: '', multi: [] },
  packages: [{ qty: '2', packaging: 'Thùng carton', length: '50', width: '40', height: '30', weight: '5' }],
  addons: [],
  invoice: { exportType: 'GIFT', currency: 'USD', shippingFee: '', items: [{ descEn: 'Dress', descVi: 'Đầm', manufacturer: '', origin: 'VN', hs: '6204', qty: '5', unit: 'PCS', price: '8' }] }
};

describe('draftDetail', () => {
  it('hàng hóa: đủ người gửi / nhận, kiện, cân tính cước, invoice', () => {
    const d = draftDetail(pack);
    expect(d.isDoc).toBe(false);
    expect(d.receiver).toContainEqual(['Điện thoại', '+1 2125550100']);
    expect(d.receiver).toContainEqual(['Thành phố / bang / mã bưu chính', 'New York City, New York, 10002']);
    expect(d.packages[0]).toEqual({ qty: '2', packaging: 'Thùng carton', size: '50 × 40 × 30 cm', weight: '5 kg' });
    expect(d.packageTotals?.chargeableWeight).toBe(24); // max(2×5, 2×50×40×30/5000)
    expect(d.items[0]).toMatchObject({ desc: 'Dress (Đầm)', qty: '5 PCS', amount: 40 });
    expect(d.invoice).toContainEqual(['Hình thức xuất khẩu', 'gift (no commercial value)']);
    expect(d.invoiceTotal).toBe(40);
  });

  it('chứng từ: không có kiện / invoice, hiện nội dung chứng từ', () => {
    const d = draftDetail({ ...pack, shipment: { type: 'DOC', pieces: '1', grossWeight: '0.5' }, goods: { ...pack.goods, docContent: 'Hợp đồng' } });
    expect(d.isDoc).toBe(true);
    expect(d.packages).toEqual([]);
    expect(d.items).toEqual([]);
    expect(d.shipment).toContainEqual(['Nội dung chứng từ', 'Hợp đồng']);
  });

  it('nháp cũ thiếu dữ liệu: hiện "—", không lỗi', () => {
    const d = draftDetail(undefined);
    expect(d.shipper[0]).toEqual(['Công ty / người gửi', '—']);
    expect(d.packageTotals).toBeNull();
  });
});
