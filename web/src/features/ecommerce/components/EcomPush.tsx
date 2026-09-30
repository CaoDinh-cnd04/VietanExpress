import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/shared/api/http';
import { useI18n } from '@/shared/i18n';
import { readFileAsText } from '@/shared/lib/files';
import { useCopyToClipboard } from '@/shared/lib/useCopyToClipboard';
import { Button, Card, FileDrop, Icon, Notice, SegmentedControl } from '@/shared/ui';
import { useImportEcomCsv } from '../api';
import { API_EXAMPLE, IMPORT_TEMPLATE_NAME, IMPORT_TEMPLATE_URL } from '../constants';
import { ManualEcomForm } from './ManualEcomForm';
import styles from './ecommerce.module.css';

const METHODS = [
  { value: 'api', label: 'Qua API' },
  { value: 'excel', label: 'Upload Excel / CSV' },
  { value: 'manual', label: 'Đánh bill lẻ' }
] as const;
type Method = (typeof METHODS)[number]['value'];

/** Tab "Đẩy đơn": 3 cách đưa đơn từ shop vào hệ thống. */
export function EcomPush() {
  const [method, setMethod] = useState<Method>('api');
  return (
    <div className="page-stack">
      <SegmentedControl ariaLabel="Cách đẩy đơn" options={METHODS} value={method} onChange={setMethod} />
      {method === 'api' && <ApiGuide />}
      {method === 'excel' && <CsvImport />}
      {method === 'manual' && <ManualEcomForm />}
    </div>
  );
}

function ApiGuide() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const copy = useCopyToClipboard();
  return (
    <Card title="Đẩy đơn qua API" actions={<Button size="sm" onClick={() => navigate('?tab=conn')}><Icon name="key" size={15} /> {t('Lấy API key')}</Button>}>
      <p className={styles.muted}>{t('Dành cho shop có lập trình viên. Gọi API để tạo 1 đơn hoặc nhiều đơn (batch ≤ 100); API trả về mã bill và link nhãn.')}</p>
      <div className={styles.codeWrap}>
        <button type="button" className={styles.codeCopy} onClick={() => void copy(API_EXAMPLE, t('Đã sao chép ví dụ cURL'))}>{t('Sao chép')}</button>
        <pre className={styles.code}>{API_EXAMPLE}</pre>
      </div>
    </Card>
  );
}

function CsvImport() {
  const { t } = useI18n();
  const importCsv = useImportEcomCsv();
  const [fileName, setFileName] = useState('');
  const [badFile, setBadFile] = useState(false);

  const onFile = async (file: File) => {
    importCsv.reset();
    setFileName(file.name);
    const isCsv = /\.csv$/i.test(file.name);
    setBadFile(!isCsv);
    if (isCsv) importCsv.mutate(await readFileAsText(file));
  };

  const result = importCsv.data;
  return (
    <Card title="Upload Excel / CSV" actions={<a className={styles.link} href={IMPORT_TEMPLATE_URL} download={IMPORT_TEMPLATE_NAME}><Icon name="download" size={15} /> {t('Tải file mẫu')}</a>}>
      <p className={styles.muted}>
        {t('Không cần lập trình: tải file mẫu 70 cột → điền nhiều đơn (mỗi đơn ≤ 5 sản phẩm) → lưu dạng CSV (UTF-8) → kéo thả lên đây. Hệ thống báo kết quả từng dòng.')}
      </p>
      <div className={styles.spaced}>
        <FileDrop
          accept=".csv,text/csv"
          disabled={importCsv.isPending}
          onFile={f => void onFile(f)}
          title={importCsv.isPending ? t('Đang xử lý {name}…', { name: fileName }) : 'Kéo & thả file CSV hoặc bấm để chọn'}
          hint="Excel: File → Save As → CSV UTF-8 (.csv)"
        />
      </div>
      {badFile && <div className={styles.spaced}><Notice tone="danger">{t('Chỉ nhận file .csv. Với file Excel, hãy lưu lại dạng CSV UTF-8.')}</Notice></div>}
      {importCsv.isError && <div className={styles.spaced}><Notice tone="danger">{getErrorMessage(importCsv.error)}</Notice></div>}
      {result && (
        <div className={styles.spaced}>
          <Notice tone={result.errors.length ? 'warning' : 'success'} title={`${fileName}: ${t(result.message)}`}>
            {result.errors.length > 0 && (
              <ul className={styles.errorList}>
                {result.errors.map((e, i) => <li key={i}>{typeof e === 'string' ? t(e) : t('Dòng {row}: {message}', { row: e.row, message: t(e.message) })}</li>)}
              </ul>
            )}
          </Notice>
        </div>
      )}
    </Card>
  );
}
