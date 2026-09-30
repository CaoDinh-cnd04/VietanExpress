import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/shared/i18n';
import { formatNumber } from '@/shared/lib/format';
import { useCopyToClipboard } from '@/shared/lib/useCopyToClipboard';
import { Button, DropdownMenu, Icon, StatusPill } from '@/shared/ui';
import { useOrder, useOrderEvents } from '../api';
import { ORDER_STATUS, PRINT_DOCUMENTS } from '../constants';
import { filledRows, invoiceTotal, lineVolume, receiverAddress, summarizePackages } from '../lib/order-detail';
import { estimatePodDate } from '../lib/order-utils';
import { usePrintDocuments } from '../mutations';
import type { Order, OrderActions, OrderDetail } from '../types';
import { TrackingLinks } from './TrackingLinks';
import styles from './OrderDrawer.module.css';

interface OrderDrawerProps {
  order: Order | null;
  onClose: () => void;
  actions: Pick<OrderActions, 'onPhotos' | 'onTrouble'>;
}

/** Hình thức xuất khẩu (MaVanDon.Ly_Do_Xuat_Hang). */
const EXPORT_TYPES: Record<string, string> = { GIFT: 'gift (no commercial value)', SAMPLE: 'sample', OTHER: 'khác' };

/**
 * Ngăn chi tiết đơn trượt từ phải.
 * Hiện ngay dữ liệu dòng trong bảng, rồi tải thêm chi tiết (người gửi / nhận, kiện, invoice) từ GET /orders/:bill.
 */
export function OrderDrawer({ order, onClose, actions }: OrderDrawerProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const copy = useCopyToClipboard();
  const print = usePrintDocuments();
  const events = useOrderEvents(order?.bill ?? null);
  const detail = useOrder(order?.bill ?? null);

  useEffect(() => {
    if (!order) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [order, onClose]);

  if (!order) return null;
  const o: OrderDetail = { ...order, ...(detail.data ?? {}) };
  const status = ORDER_STATUS[o.st];
  const estimate = estimatePodDate(o);
  const pod = o.pod ? `${o.pod.date} ${o.pod.time}`.trim() : estimate ? t('Dự kiến {date}', { date: estimate }) : '';

  return (
    <>
      <div className={styles.scrim} onClick={onClose} />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="order-drawer-title">
        <header className={styles.header}>
          <div className={styles.headMain}>
            <p className={styles.kicker}>{t('Chi tiết đơn hàng')}</p>
            <h2 id="order-drawer-title" className={styles.title}>
              VA Bill <span className="mono">{o.bill}</span>
              <button type="button" className={styles.iconBtn} onClick={() => void copy(o.bill, t('Đã sao chép mã bill'))} aria-label={t('Sao chép mã bill')} title={t('Sao chép mã bill')}>
                <Icon name="copy" size={14} />
              </button>
            </h2>
            <div className={styles.headMeta}>
              <StatusPill tone={status.tone}>{t(status.label)}</StatusPill>
              {o.ref && <span className={styles.ref}>Ref: <span className="mono">{o.ref}</span></span>}
            </div>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label={t('Đóng')}>
            <Icon name="close" size={16} />
          </button>
        </header>

        <div className={styles.toolbar}>
          <DropdownMenu
            items={PRINT_DOCUMENTS.map(d => ({ label: d.label, onSelect: () => void print([o.bill], d.key) }))}
            trigger={({ open, toggle }) => (
              <Button size="sm" variant="primary" onClick={toggle} aria-expanded={open} aria-haspopup="menu">
                <Icon name="printer" size={15} /> {t('In')} <Icon name="chevronDown" size={14} />
              </Button>
            )}
          />
          <Button size="sm" onClick={() => navigate(`/orders/new?from=${encodeURIComponent(o.bill)}`)}>
            <Icon name="copy" size={15} /> {t('Nhân bản đơn')}
          </Button>
          <Button size="sm" onClick={() => actions.onPhotos(o)}>
            <Icon name="image" size={15} /> {o.photos ? t('Ảnh kiện ({n})', { n: o.photos }) : t('Ảnh kiện')}
          </Button>
          <Button size="sm" variant="danger" onClick={() => actions.onTrouble(o)}>
            <Icon name="alert" size={15} /> {t('Báo sự cố')}
          </Button>
        </div>

        <div className={styles.body}>
          {/* Tóm tắt: tuyến + các mốc chính */}
          <section className={styles.summary}>
            <div className={styles.route}>
              <div>
                <span className={styles.routeLabel}>{t('Từ')}</span>
                <strong>{t('Việt Nam')}</strong>
              </div>
              <span className={styles.arrow} aria-hidden="true">→</span>
              <div>
                <span className={styles.routeLabel}>{t('Đến')}</span>
                <strong>{o.ct}</strong>
              </div>
              <div className={styles.serviceCol}>
                <span className={styles.routeLabel}>{t('Dịch vụ')}</span>
                <strong>{t(o.route)}</strong>
              </div>
            </div>
            <dl className={styles.stats}>
              {filledRows([
                ['Kiện / cân', t(o.pcs)],
                ['Loại hàng', o.type],
                ['Ngày tạo', o.created],
                ['Ngày gửi', o.sent || t('Chưa gửi')],
                ['POD', pod],
                ['Người ký', o.pod?.signer]
              ] as const).map(([k, v]) => (
                <div key={k}>
                  <dt>{t(k)}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <Section title="Tracking">
            <TrackingLinks bill={o.bill} />
            {o.connect && (
              <p className={styles.connect}>
                {t('Mã tracking hãng')}: <span className="mono">{o.connect}</span>
                <button type="button" className={styles.iconBtn} onClick={() => void copy(o.connect!, t('Đã sao chép mã tracking hãng'))} aria-label={t('Sao chép mã tracking hãng')}>
                  <Icon name="copy" size={13} />
                </button>
              </p>
            )}
          </Section>

          <Section title="Hành trình">
            {events.data?.length ? (
              <ol className={styles.timeline}>
                {events.data.map((ev, i) => (
                  <li key={`${ev.time}-${i}`} className={i === 0 ? styles.now : undefined}>
                    <strong>{t(ev.title)}</strong>
                    <span>{ev.time}{ev.location ? ` · ${ev.location}` : ''}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.muted}>{t(events.isLoading ? 'Đang tải…' : 'Chưa có cập nhật hành trình — xem chi tiết qua VA Track.')}</p>
            )}
          </Section>

          {detail.isLoading ? (
            <p className={styles.muted}>{t('Đang tải chi tiết đơn…')}</p>
          ) : (
            <>
              <Parties detail={o} />
              <Packages detail={o} />
              <Invoice detail={o} content={o.content} />
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{t(title)}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Parties({ detail: o }: { detail: OrderDetail }) {
  const { t } = useI18n();
  const s = o.shipper;
  const r = o.receiver;
  const shipperRows = s ? filledRows([['Liên hệ', s.contact], ['Điện thoại', s.tel], ['Email', s.email], ['Mã số thuế', s.taxId]] as const) : [];
  const receiverRows = r ? filledRows([['Liên hệ', r.contact], ['Điện thoại', r.tel], ['Email', r.email], ['Mã số thuế', r.taxId]] as const) : [];

  return (
    <Section title="Người gửi & người nhận">
      <div className={styles.parties}>
        <div className={styles.party}>
          <span className={styles.partyLabel}>{t('Người gửi')}</span>
          <strong>{s?.company || '—'}</strong>
          {s?.address && <p className={styles.address}>{s.address}</p>}
          <PartyRows rows={shipperRows} />
          {o.branch && <p className={styles.muted}>{t('Chi nhánh gửi')}: {o.branch}</p>}
        </div>
        <div className={styles.party}>
          <span className={styles.partyLabel}>{t('Người nhận')}</span>
          <strong>{r?.company || o.cnee}</strong>
          <p className={styles.address}>{(r ? receiverAddress(r) : [o.ct]).join('\n')}</p>
          <PartyRows rows={receiverRows} />
        </div>
      </div>
    </Section>
  );
}

function PartyRows({ rows }: { rows: Array<[string, string]> }) {
  const { t } = useI18n();
  if (!rows.length) return null;
  return (
    <dl className={styles.partyRows}>
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{t(k)}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Packages({ detail: o }: { detail: OrderDetail }) {
  const { t } = useI18n();
  const list = o.packages ?? [];
  if (!list.length) return null;
  const sum = summarizePackages(list);
  return (
    <Section title="Kiện hàng" aside={<span className={styles.sectionAside}>{t('{n} kiện', { n: sum.pieces })}</span>}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('SL')}</th>
              <th>{t('Bao bì')}</th>
              <th>{t('D × R × C (cm)')}</th>
              <th className={styles.num}>{t('Cân / kiện')}</th>
              <th className={styles.num}>{t('Quy đổi')}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p, i) => (
              <tr key={i}>
                <td>{p.qty}</td>
                <td>{p.packType || '—'}</td>
                <td className="tabular">{p.length && p.width && p.height ? `${p.length} × ${p.width} × ${p.height}` : '—'}</td>
                <td className={styles.num}>{formatNumber(p.weightKg)} kg</td>
                <td className={styles.num}>{formatNumber(lineVolume(p))} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className={styles.totals}>
        <div><dt>{t('Cân thực')}</dt><dd>{formatNumber(sum.gross)} kg</dd></div>
        <div><dt>{t('Cân quy đổi')}</dt><dd>{formatNumber(sum.volume)} kg</dd></div>
        <div className={styles.totalMain}><dt>{t('Cân tính cước')}</dt><dd>{formatNumber(sum.chargeable)} kg</dd></div>
      </dl>
    </Section>
  );
}

function Invoice({ detail: o, content }: { detail: OrderDetail; content: string }) {
  const { t } = useI18n();
  const inv = o.invoice;
  const items = inv?.items ?? [];
  if (!items.length) {
    return (
      <Section title="Hàng hóa">
        <p>{content || '—'}</p>
      </Section>
    );
  }
  const cur = inv?.currency || '';
  const money = (n: number) => `${formatNumber(n)}${cur ? ` ${cur}` : ''}`;
  return (
    <Section title="Invoice" aside={inv?.exportType ? <span className={styles.sectionAside}>{t(EXPORT_TYPES[inv.exportType] ?? inv.exportType)}</span> : undefined}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('Mặt hàng')}</th>
              <th className={styles.num}>{t('SL / ĐVT')}</th>
              <th className={styles.num}>{t('Đơn giá')}</th>
              <th className={styles.num}>{t('Thành tiền')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>
                  <strong>{it.descEn || it.descVi || '—'}</strong>
                  {it.descEn && it.descVi && <div className={styles.muted}>{it.descVi}</div>}
                  {(it.hs || it.origin) && <div className={styles.itemMeta}>{[it.hs && `HS ${it.hs}`, it.origin].filter(Boolean).join(' · ')}</div>}
                </td>
                <td className={styles.num}>{formatNumber(it.qty)} {it.unit}</td>
                <td className={styles.num}>{money(it.price)}</td>
                <td className={styles.num}>{money(it.amount || it.qty * it.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className={styles.totals}>
        {inv?.shippingFee ? <div><dt>Shipping fee</dt><dd>{money(inv.shippingFee)}</dd></div> : null}
        <div className={styles.totalMain}><dt>{t('Tổng giá trị hàng')}</dt><dd>{money(invoiceTotal(items))}</dd></div>
      </dl>
    </Section>
  );
}
