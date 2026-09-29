import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from '@/features/auth';
import { Button, Icon, SegmentedControl, TextAreaField } from '@/shared/ui';
import { MAX_TRACK_BILLS, parseBills } from '../lib/tracking';
import styles from './HeroPanel.module.css';

type Tab = 'track' | 'login';

interface HeroPanelProps {
  /** Mã đang tra (từ `?track=`) — điền sẵn vào ô nhập. */
  initialBills: readonly string[];
  onTrack: (bills: string[]) => void;
  tracking: boolean;
}

/** Khung "Tra cứu & đăng nhập" ở đầu trang. Tab đồng bộ với URL: `/` = tra cứu, `/login` = đăng nhập. */
export function HeroPanel({ initialBills, onTrack, tracking }: HeroPanelProps) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const tab: Tab = pathname === '/login' ? 'login' : 'track';

  return (
    <div className={styles.panel} id="tra-cuu">
      <SegmentedControl<Tab>
        ariaLabel="Chọn chức năng"
        value={tab}
        onChange={t => void navigate({ pathname: t === 'login' ? '/login' : '/', search }, { replace: true })}
        options={[
          { value: 'track', label: 'Tra cứu vận đơn' },
          { value: 'login', label: 'Đăng nhập portal' }
        ]}
      />
      {tab === 'track' ? (
        <TrackForm initialBills={initialBills} onTrack={onTrack} tracking={tracking} />
      ) : (
        <LoginForm autoFocus />
      )}
    </div>
  );
}

function TrackForm({ initialBills, onTrack, tracking }: HeroPanelProps) {
  const [text, setText] = useState(() => initialBills.join('\n'));
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const { bills, invalid, dropped } = parseBills(text);
    if (bills.length === 0) {
      setWarning(undefined);
      return setError(invalid.length > 0 ? `Số vận đơn không hợp lệ: ${invalid.join(', ')}` : 'Nhập ít nhất 1 số vận đơn');
    }
    setError(undefined);
    const notes = [
      invalid.length > 0 && `Bỏ qua mã sai định dạng: ${invalid.join(', ')}`,
      dropped > 0 && `Chỉ tra ${MAX_TRACK_BILLS} vận đơn đầu tiên, bỏ qua ${dropped} số`
    ].filter(Boolean);
    setWarning(notes.length > 0 ? notes.join('. ') : undefined);
    onTrack(bills);
  };

  return (
    <form onSubmit={submit} noValidate className="page-stack">
      <TextAreaField
        label="Số vận đơn"
        rows={4}
        placeholder={'Mỗi dòng 1 số vận đơn\nVD: 6156979'}
        hint={warning ?? `Tối đa ${MAX_TRACK_BILLS} số mỗi lần, cách nhau bằng xuống dòng hoặc dấu phẩy`}
        error={error}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          // Ctrl/Cmd + Enter để tra nhanh.
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
        }}
      />
      <Button variant="primary" type="submit" className={styles.submit} disabled={tracking}>
        <Icon name="search" size={16} />
        {tracking ? 'Đang tra cứu…' : 'Theo dõi vận đơn'}
      </Button>
    </form>
  );
}
