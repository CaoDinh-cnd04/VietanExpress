import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui';
import { isOnScreen, popoverPosition, type Box } from '../lib/tour';
import { TOUR_STEPS } from '../steps';
import styles from './OnboardingTour.module.css';

interface OnboardingTourProps {
  open: boolean;
  onClose: () => void;
}

const PAD = 6;

const findTarget = (name?: string) => (name ? document.querySelector<HTMLElement>(`[data-tour="${name}"]`) : null);

const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });

/** Hướng dẫn từng bước: làm tối màn hình, chiếu sáng vùng chức năng và hiện khung chú thích bên cạnh. */
export function OnboardingTour({ open, onClose }: OnboardingTourProps) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<Box | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = TOUR_STEPS[index]!;
  const last = index === TOUR_STEPS.length - 1;

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Đo vùng chức năng của bước hiện tại; đo lại khi đổi kích thước / cuộn.
  const measure = useCallback(() => {
    const el = findTarget(step.target);
    const r = el?.getBoundingClientRect();
    setTarget(r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null);
  }, [step.target]);

  useEffect(() => {
    if (!open) return;
    findTarget(step.target)?.scrollIntoView({ block: 'nearest' });
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step.target, measure]);

  // Đặt khung chú thích sau khi biết kích thước thật của khung.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!open || !card) return;
    const { width, height } = card.getBoundingClientRect();
    const p = popoverPosition(target, { width, height }, viewport(), step.placement);
    setPos({ top: p.top, left: p.left });
    card.focus();
  }, [open, target, step.placement, index]);

  const next = useCallback(() => (last ? onClose() : setIndex(i => i + 1)), [last, onClose]);
  const back = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, back, onClose]);

  if (!open) return null;

  const spot = isOnScreen(target, viewport()) ? target : null;

  return createPortal(
    <div className={styles.layer}>
      {/* Chặn bấm vào trang phía sau trong lúc xem hướng dẫn */}
      <div className={spot ? styles.blocker : `${styles.blocker} ${styles.dim}`} />
      {spot && (
        <div
          className={styles.spot}
          style={{ top: spot.top - PAD, left: spot.left - PAD, width: spot.width + PAD * 2, height: spot.height + PAD * 2 }}
        />
      )}
      <div
        ref={cardRef}
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' }}
      >
        <div className={styles.meta}>
          Bước {index + 1}/{TOUR_STEPS.length}
          <span className={styles.dots} aria-hidden="true">
            {TOUR_STEPS.map((s, i) => <span key={s.title} className={i === index ? styles.dotOn : styles.dot} />)}
          </span>
        </div>
        <h2 id="tour-title" className={styles.title}>{step.title}</h2>
        <p id="tour-body" className={styles.body}>{step.body}</p>
        <div className={styles.actions}>
          {last ? (
            <Button size="sm" variant="ghost" onClick={onClose}>Để sau</Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={onClose}>Bỏ qua</Button>
          )}
          <span className={styles.spacer} />
          {index > 0 && <Button size="sm" onClick={back}>Quay lại</Button>}
          {last ? (
            <Button size="sm" variant="primary" onClick={() => { onClose(); void navigate('/orders/new'); }}>Tạo đơn đầu tiên</Button>
          ) : (
            <Button size="sm" variant="primary" onClick={next}>{index === 0 ? 'Bắt đầu' : 'Tiếp theo'}</Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
