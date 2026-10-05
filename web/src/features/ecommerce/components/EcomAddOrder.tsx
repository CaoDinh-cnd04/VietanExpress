import { useState } from 'react';
import { getErrorMessage } from '@/shared/api/http';
import { useI18n } from '@/shared/i18n';
import { readFileAsText } from '@/shared/lib/files';
import { Card, FileDrop, Icon, Notice, SegmentedControl } from '@/shared/ui';
import { useImportEcomCsv } from '../api';
import { IMPORT_TEMPLATE_NAME, IMPORT_TEMPLATE_URL } from '../constants';
import { ManualEcomForm } from './ManualEcomForm';
import styles from './ecommerce.module.css';

const METHODS = [
  { value: 'manual', label: 'Nhập tay từng đơn' },
  { value: 'excel', label: 'Từ file Excel / CSV' }
] as const;
type Method = (typeof METHODS)[number]['value'];

/** Tab "Thêm đơn": nhập tay từng đơn (mặc định) hoặc nhập nhiều đơn bằng file. Đơn từ sàn đã kết nối tự về, không cần thêm ở đây. */
export function EcomAddOrder() {
  const [method, setMethod] = useState<Method>('manual');
  return (
    <div className="page-stack">
      <SegmentedControl ariaLabel="Cách thêm đơn" options={METHODS} value={method} onChange={setMethod} />
      {method === 'manual' ? <ManualEcomForm /> : <CsvImport />}
    </div>
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
    <Card title="Nhập đơn từ file" actions={<a className={styles.link} href={IMPORT_TEMPLATE_URL} download={IMPORT_TEMPLATE_NAME}><Icon name="download" size={15} /> {t('Tải file mẫu')}</a>}>
      <p className={styles.muted}>
        {t('Tải file mẫu, điền đơn (mỗi đơn tối đa 5 sản phẩm), lưu dạng CSV UTF-8 rồi kéo thả lên đây. Hệ thống báo kết quả từng dòng.')}
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
