import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { billsFromQuery, billsToQuery, parseBills, TrackingDetail, useTracking } from '@/features/landing';
import { getErrorMessage } from '@/shared/api/http';
import { useI18n } from '@/shared/i18n';
import { Icon, Notice } from '@/shared/ui';
import { usePublicMyTracking } from '../api';
import { TrackingLayout } from '../components/TrackingLayout';
import layout from './MyTrackingPage.module.css';
import styles from './PublicMyTrackingPage.module.css';

/**
 * Trang tra cứu MyTracking công khai của khách: /t/{đường dẫn}?bills=MA1,MA2.
 * Khách gửi link cho người nhận hàng; không cần đăng nhập. Tra cứu dùng POST /public/tracking như trang ngoài.
 */
export default function PublicMyTrackingPage() {
  const { t } = useI18n();
  const { slug = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const page = usePublicMyTracking(slug);
  const bills = billsFromQuery(params.get('bills'));
  const tracking = useTracking(bills);
  const config = page.data?.config;

  useEffect(() => {
    if (config) document.title = config.brand.companyName || config.title;
  }, [config]);

  if (page.isPending) return <p className={styles.center}>{t('Đang tải…')}</p>;
  if (!config) {
    return (
      <div className={styles.center}>
        <div className={styles.missing}>
          <Icon name="search" size={28} />
          <h1>{t('Không tìm thấy trang tra cứu')}</h1>
          <p>{t('Trang tra cứu không tồn tại hoặc chưa được xuất bản. Vui lòng kiểm tra lại đường dẫn.')}</p>
        </div>
      </div>
    );
  }

  const search = (next: string[]) => setParams(next.length ? { bills: billsToQuery(next) } : {}, { replace: false });

  return (
    <div className={styles.page}>
      <TrackingLayout config={config} standalone>
        <SearchForm key={params.get('bills') ?? ''} initial={bills} busy={tracking.isFetching} onSearch={search} />
        <h2 className={layout.blackBar}>TRACKING DETAIL</h2>
        {bills.length === 0 ? (
          <div className={layout.trackingPlaceholder}>
            <Icon name="box" size={26} />
            <p>{t('Nhập số vận đơn để xem hành trình kiện hàng.')}</p>
          </div>
        ) : tracking.error ? (
          <Notice tone="danger" title="Không tra cứu được">{t(getErrorMessage(tracking.error, 'Không kết nối được máy chủ'))}</Notice>
        ) : tracking.isPending ? (
          <div className={layout.trackingPlaceholder} aria-busy="true"><p>{t('Đang tra cứu…')}</p></div>
        ) : (
          <div className={styles.results}>
            {bills.map(bill => {
              const result = tracking.data?.find(r => r.bill === bill);
              return result?.found
                ? <TrackingDetail key={bill} result={result} />
                : <p key={bill} className={styles.notFound}>{t('Không tìm thấy vận đơn {bill}', { bill })}</p>;
            })}
          </div>
        )}
      </TrackingLayout>
      <p className={styles.powered}>{t('Vận chuyển bởi')} <a href="/" target="_blank" rel="noreferrer">Việt An Express</a></p>
    </div>
  );
}

function SearchForm({ initial, busy, onSearch }: { initial: string[]; busy: boolean; onSearch: (bills: string[]) => void }) {
  const { t } = useI18n();
  const [text, setText] = useState(() => initial.join(', '));
  const [error, setError] = useState<string>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const { bills, invalid } = parseBills(text);
    if (bills.length === 0) {
      setError(invalid.length ? t('Số vận đơn không hợp lệ: {bills}', { bills: invalid.join(', ') }) : t('Nhập ít nhất 1 số vận đơn'));
      return;
    }
    setError(undefined);
    onSearch(bills);
  };

  return (
    <form role="search" onSubmit={submit} noValidate>
      <div className={layout.trackingSearch}>
        <input value={text} onChange={e => setText(e.target.value)} aria-label="Tracking number" placeholder="Tracking number"
          autoComplete="off" spellCheck={false} aria-invalid={error ? true : undefined} />
        <button type="submit" disabled={busy}>Track</button>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
  );
}
