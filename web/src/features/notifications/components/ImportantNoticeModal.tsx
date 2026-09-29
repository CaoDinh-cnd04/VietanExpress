import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal } from '@/shared/ui';
import { useNotifications } from '../api';
import styles from './notifications.module.css';

const HIDE_KEY = 'va.importantNotice.hiddenOn';
const today = () => new Date().toISOString().slice(0, 10);
const hiddenToday = () => {
  try {
    return window.localStorage.getItem(HIDE_KEY) === today();
  } catch {
    return false;
  }
};

/** Popup "Thông báo quan trọng" khi mở portal; có tùy chọn không hiện lại trong ngày. */
export function ImportantNoticeModal() {
  const navigate = useNavigate();
  const { data } = useNotifications();
  const [dismissed, setDismissed] = useState(hiddenToday);
  const [hideToday, setHideToday] = useState(false);
  const important = (data?.data ?? []).filter(n => n.imp && n.unread);

  const close = () => {
    if (hideToday) {
      try {
        window.localStorage.setItem(HIDE_KEY, today());
      } catch {
        /* storage bị chặn */
      }
    }
    setDismissed(true);
  };

  return (
    <Modal
      open={!dismissed && important.length > 0}
      title="Thông báo quan trọng"
      onClose={close}
      footerNote={
        <label className={styles.hideToday}>
          <input type="checkbox" checked={hideToday} onChange={e => setHideToday(e.target.checked)} /> Không hiện lại hôm nay
        </label>
      }
      footer={
        <>
          <Button onClick={() => { close(); navigate('/notifications'); }}>Xem tất cả</Button>
          <Button variant="primary" onClick={close}>Đã hiểu</Button>
        </>
      }
    >
      <div className={styles.popList}>
        {important.map(n => (
          <article key={n.id} className={styles.popItem}>
            <h3>{n.title}</h3>
            <p>{n.body.split('\n')[0]}</p>
            <time>{n.date}</time>
          </article>
        ))}
      </div>
    </Modal>
  );
}
