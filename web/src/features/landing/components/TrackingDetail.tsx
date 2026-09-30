import { useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { useCopyToClipboard } from '@/shared/lib/useCopyToClipboard';
import { Button, Icon, StatusPill } from '@/shared/ui';
import { TRACK_STATUS } from '../constants';
import { groupEventsByDay, TRACK_STEPS, trackStep } from '../lib/tracking-detail';
import type { FoundTrackResult } from '../types';
import styles from './TrackingDetail.module.css';

/** Số mốc hành trình hiện sẵn; còn lại bấm "Xem thêm". */
const COLLAPSED_LINES = 8;
const PENDING = 'Đang cập nhật';

/** Chi tiết 1 vận đơn: trạng thái, tiến trình, thông tin gửi – nhận và hành trình theo ngày. */
export function TrackingDetail({ result: r }: { result: FoundTrackResult }) {
  const { t } = useI18n();
  const copy = useCopyToClipboard();
  const [expanded, setExpanded] = useState(false);
  const status = TRACK_STATUS[r.status];
  const step = trackStep(r.status);
  const latest = r.events[0];

  const days = groupEventsByDay(r.events);
  const total = r.events.length;
  // Đánh số thứ tự từng mốc; mốc vượt COLLAPSED_LINES ẩn bằng CSS (bản in vẫn đủ).
  let index = 0;
  const numberedDays = days.map(d => ({ ...d, items: d.items.map(e => ({ ...e, index: index++ })) }));
  const hidden = (i: number) => !expanded && i >= COLLAPSED_LINES;

  return (
    <article className={styles.detail} aria-labelledby={`awb-${r.bill}`}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>{t('Mã vận đơn Việt An')}</p>
          <h2 id={`awb-${r.bill}`} className={styles.awb}>
            {r.bill}
            <Button iconOnly size="sm" variant="ghost" aria-label={t('Sao chép mã vận đơn')} title={t('Sao chép')}
              onClick={() => void copy(r.bill, t('Đã sao chép mã vận đơn'))}>
              <Icon name="copy" size={16} />
            </Button>
          </h2>
          {r.carrierBill && r.carrierBill !== r.bill && (
            <p className={styles.carrierBill}>{t('Mã hãng:')} <span>{r.carrierBill}</span></p>
          )}
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </header>

      <div className={cx(styles.banner, styles[`banner_${status.tone}`])}>
        <span className={styles.bannerIcon}><Icon name={status.icon} size={22} /></span>
        <div>
          <p className={styles.bannerTitle}>{t(latest?.title ?? status.label)}</p>
          <p className={styles.bannerMeta}>
            {[latest?.time, latest?.location].filter(Boolean).join(' · ') || t('Chưa có cập nhật hành trình')}
          </p>
        </div>
      </div>

      <ol className={styles.steps} aria-label={t('Tiến trình vận chuyển')}>
        {TRACK_STEPS.map((label, i) => {
          const done = i < step.current || (i === step.current && !step.problem);
          const current = i === step.current;
          return (
            <li key={label} className={cx(styles.step, done && styles.stepDone, current && styles.stepCurrent,
              current && step.problem && styles.stepProblem)} aria-current={current ? 'step' : undefined}>
              <span className={styles.stepDot}>
                {current && step.problem ? <Icon name="alert" size={14} /> : done ? <Icon name="check" size={14} /> : i + 1}
              </span>
              <span className={styles.stepLabel}>{t(label)}</span>
            </li>
          );
        })}
      </ol>

      <dl className={styles.info}>
        <InfoItem icon="mapPin" label="Gửi từ" value={r.origin} />
        <InfoItem icon="globe" label="Gửi đến" value={r.destination} />
        <InfoItem icon="clock" label="Ngày gửi" value={r.shipDate} />
        <InfoItem icon="target" label="Dự kiến giao" value={r.estimatedDate} />
        <InfoItem icon="plane" label="Dịch vụ" value={r.service} />
        <InfoItem icon="box" label="Số kiện / cân"
          value={r.pieces || r.weightKg ? [r.pieces && t('{n} kiện', { n: r.pieces }), r.weightKg && `${r.weightKg} kg`].filter(Boolean).join(' · ') : undefined} />
      </dl>

      <section className={styles.history} aria-label={t('Hành trình vận đơn')}>
        <h3 className={styles.historyTitle}>
          {t('Hành trình')} <span className={styles.count}>{t('{n} cập nhật', { n: total })}</span>
        </h3>

        {total === 0 ? (
          <p className={styles.empty}>{t('Chưa có cập nhật hành trình. Thông tin sẽ hiện khi hàng được xử lý tại kho.')}</p>
        ) : (
          <div className={styles.timeline}>
            {numberedDays.map((d, di) => (
              <div key={`${d.day}-${di}`} className={cx(styles.day, d.items.every(e => hidden(e.index)) && styles.extra)}>
                <p className={styles.dayLabel}>{t(d.day)}</p>
                <ul className={styles.lines}>
                  {d.items.map((e, i) => (
                    <li key={i} className={cx(styles.line, e.index === 0 && styles.lineLatest, hidden(e.index) && styles.extra)}>
                      <span className={styles.time}>{e.time || '—'}</span>
                      <span className={styles.activity}>{t(e.title)}</span>
                      <span className={styles.location}>
                        {e.location && <><Icon name="mapPin" size={13} /> {e.location}</>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {total > COLLAPSED_LINES && (
          <Button size="sm" variant="ghost" className={styles.more} onClick={() => setExpanded(v => !v)} aria-expanded={expanded}>
            {expanded ? t('Thu gọn') : t('Xem thêm {n} cập nhật', { n: total - COLLAPSED_LINES })}
            <Icon name="chevronDown" size={14} className={cx(expanded && styles.flip)} />
          </Button>
        )}
      </section>
    </article>
  );
}

function InfoItem({ icon, label, value }: { icon: Parameters<typeof Icon>[0]['name']; label: string; value?: string | false }) {
  const { t } = useI18n();
  return (
    <div className={styles.infoItem}>
      <dt><Icon name={icon} size={15} /> {t(label)}</dt>
      <dd className={cx(!value && styles.pending)}>{value || t(PENDING)}</dd>
    </div>
  );
}
