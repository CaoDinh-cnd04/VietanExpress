import { useEffect, useState } from 'react';
import { isNotImplemented } from '@/shared/api/http';
import { useCopyToClipboard } from '@/shared/lib/useCopyToClipboard';
import { Button, Card, Icon, Notice, TextField } from '@/shared/ui';
import { useEcomSettings, useRegenerateApiKey, useSaveEcomSettings, useTestWebhook } from '../api';
import { ECOM_SOURCES, MARKETPLACES, WEBHOOK_EVENTS } from '../constants';
import type { EcomSettings } from '../types';
import styles from './ecommerce.module.css';

/** Tab "Kết nối & API": API key, webhook trạng thái, gắn nguồn sàn. */
export function EcomConnections() {
  const settings = useEcomSettings();
  const save = useSaveEcomSettings();
  const regenerate = useRegenerateApiKey();
  const testWebhook = useTestWebhook();
  const copy = useCopyToClipboard();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [events, setEvents] = useState<EcomSettings['webhookEvents']>([]);
  const data = settings.data;
  const unavailable = settings.isError;

  useEffect(() => {
    if (!data) return;
    setWebhookUrl(data.webhookUrl);
    setEvents(data.webhookEvents);
  }, [data]);

  const toggleSource = (src: EcomSettings['connectedSources'][number]) => {
    if (!data) return;
    const connected = data.connectedSources.includes(src);
    save.mutate({ connectedSources: connected ? data.connectedSources.filter(s => s !== src) : [...data.connectedSources, src] });
  };

  return (
    <div className="page-stack">
      {unavailable && (
        <Notice tone="warning" title="Chưa kết nối được cấu hình tích hợp">
          {isNotImplemented(settings.error)
            ? 'Máy chủ chưa có chức năng cấu hình tích hợp (GET /ecom/settings). Phần này sẽ hoạt động khi backend hoàn tất.'
            : 'Không tải được cấu hình, vui lòng thử lại sau.'}
        </Notice>
      )}

      <div className={styles.twoCol}>
        <Card title="API key">
          <div className={styles.keyList}>
            {(data?.apiKeys ?? []).map(k => (
              <div key={k.env} className={styles.keyRow}>
                <span className={styles.keyEnv}>{k.env === 'production' ? 'Production' : 'Sandbox'}</span>
                <code className={styles.key}>{k.key}</code>
                <Button size="sm" iconOnly aria-label={`Sao chép key ${k.env}`} onClick={() => void copy(k.key, 'Đã sao chép API key')}><Icon name="copy" size={15} /></Button>
                <Button size="sm" onClick={() => regenerate.mutate(k.env)} disabled={regenerate.isPending}><Icon name="refresh" size={15} /> Tạo lại</Button>
              </div>
            ))}
            {!data && <p className={styles.muted}>{settings.isLoading ? 'Đang tải…' : 'Chưa có API key.'}</p>}
          </div>
          <p className={styles.hint}>Tạo lại key sẽ vô hiệu key cũ ngay lập tức. Dùng key Sandbox để thử nghiệm, không tạo đơn thật.</p>
        </Card>

        <Card title="Webhook trạng thái đơn">
          <div className="page-stack">
            <TextField label="URL nhận webhook" type="url" placeholder="https://shop.com/webhook/vietan" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} disabled={unavailable} />
            <fieldset className={styles.events} disabled={unavailable}>
              <legend>Sự kiện gửi</legend>
              {WEBHOOK_EVENTS.map(ev => (
                <label key={ev}>
                  <input type="checkbox" checked={events.includes(ev)} onChange={() => setEvents(list => (list.includes(ev) ? list.filter(x => x !== ev) : [...list, ev]))} />
                  <code>{ev}</code>
                </label>
              ))}
            </fieldset>
            <div className={styles.formActions}>
              <Button onClick={() => testWebhook.mutate()} disabled={unavailable || !webhookUrl || testWebhook.isPending}><Icon name="send" size={15} /> Gửi thử</Button>
              <Button variant="primary" onClick={() => save.mutate({ webhookUrl, webhookEvents: events })} disabled={unavailable || save.isPending}>Lưu webhook</Button>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Gắn nguồn sàn" subtitle="· đơn được gắn nhãn nguồn để lọc & đối soát">
        <div className={styles.connGrid}>
          {MARKETPLACES.map(m => {
            const connected = data?.connectedSources.includes(m.source) ?? false;
            return (
              <div key={m.source} className={styles.connCard}>
                <div>
                  <strong>{ECOM_SOURCES[m.source].label}</strong>
                  <p className={styles.muted}>{m.description}</p>
                </div>
                <Button size="sm" variant={connected ? 'secondary' : 'primary'} disabled={unavailable || save.isPending} onClick={() => toggleSource(m.source)}>
                  {connected ? 'Ngắt kết nối' : 'Kết nối'}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
