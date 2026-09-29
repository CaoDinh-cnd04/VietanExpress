import { useState } from 'react';
import { getErrorMessage } from '@/shared/api/http';
import { BRANCHES, CARRIER_HUBS, CARRIERS } from '@/shared/config/domain';
import { downloadTextFile, parseCsv, readFileAsText, toCsv } from '@/shared/lib/files';
import { Button, Card, DataTable, FileDrop, FormGrid, Icon, LinkButton, Notice, PageHeader, SelectField, StatusPill, type Column } from '@/shared/ui';
import { useBatchCreateOrders } from '../api';
import { IMPORT_COLUMNS, missingHeaders, templateRows, toBatchOrder, validateRows, type ValidatedRow } from '../lib/import-rows';
import styles from './OrderImportPage.module.css';

/** Tối đa mỗi lần gửi — khớp giới hạn batch của API. */
const BATCH_LIMIT = 100;
const PREVIEW_COLS = IMPORT_COLUMNS.filter(c => ['ref', 'receiverCompany', 'country', 'city', 'pieces', 'weightKg', 'content'].includes(c.field));

export default function OrderImportPage() {
  const [service, setService] = useState('Chuyên tuyến');
  const [hub, setHub] = useState(CARRIER_HUBS['Chuyên tuyến']?.[0] ?? '');
  const [branch, setBranch] = useState('TP.HCM');
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [rows, setRows] = useState<ValidatedRow[]>([]);

  const valid = rows.filter(r => !r.errors.length);
  const invalid = rows.length - valid.length;

  const submit = useBatchCreateOrders();

  const onFile = async (file: File) => {
    submit.reset();
    setFileName(file.name);
    setRows([]);
    if (!/\.csv$/i.test(file.name)) return setFileError('Chỉ nhận file .csv. Với file Excel, hãy lưu lại dạng CSV UTF-8.');
    const { headers, rows: raw } = parseCsv(await readFileAsText(file));
    const missing = missingHeaders(headers);
    if (missing.length) return setFileError(`File thiếu cột bắt buộc: ${missing.join(', ')}. Vui lòng dùng file mẫu.`);
    if (!raw.length) return setFileError('File không có dòng dữ liệu nào.');
    if (raw.length > BATCH_LIMIT) return setFileError(`Mỗi lần tối đa ${BATCH_LIMIT} đơn — file có ${raw.length} dòng. Vui lòng tách file.`);
    setFileError('');
    setRows(validateRows(raw));
  };

  const columns: ReadonlyArray<Column<ValidatedRow>> = [
    { key: 'line', header: 'Dòng', width: 60, render: r => r.line },
    ...PREVIEW_COLS.map(c => ({ key: c.field, header: c.header, render: (r: ValidatedRow) => r.data[c.field] || <span className={styles.muted}>—</span> })),
    {
      key: 'result',
      header: 'Kiểm tra',
      render: r => (r.errors.length ? <span className={styles.error}>{r.errors.join(' · ')}</span> : <StatusPill tone="brand">Hợp lệ</StatusPill>)
    }
  ];

  return (
    <>
      <PageHeader
        title="Tạo đơn từ Excel"
        description="Tạo nhiều đơn cùng lúc: chọn dịch vụ mặc định → điền file mẫu → tải lên → kiểm tra → tạo đơn."
        actions={
          <Button size="sm" onClick={() => downloadTextFile('VietAn_Mau_Tao_Don.csv', toCsv(templateRows()))}>
            <Icon name="download" size={15} /> Tải file mẫu
          </Button>
        }
      />
      <div className="page-stack">
        <Card title="1. Dịch vụ mặc định cho cả file">
          <FormGrid columns={3}>
            <SelectField label="Dịch vụ" options={CARRIERS} value={service} onChange={e => { setService(e.target.value); setHub(CARRIER_HUBS[e.target.value]?.[0] ?? ''); }} />
            <SelectField label="Hub" options={CARRIER_HUBS[service] ?? []} value={hub} onChange={e => setHub(e.target.value)} />
            <SelectField label="Chi nhánh gửi" options={BRANCHES} value={branch} onChange={e => setBranch(e.target.value)} />
          </FormGrid>
        </Card>

        <Card title="2. Tải file lên">
          <FileDrop accept=".csv,text/csv" onFile={f => void onFile(f)} title={fileName || 'Kéo & thả file CSV hoặc bấm để chọn'} hint={`Tối đa ${BATCH_LIMIT} đơn / lần · Excel: File → Save As → CSV UTF-8`} />
          {fileError && <div className={styles.spaced}><Notice tone="danger">{fileError}</Notice></div>}
        </Card>

        {rows.length > 0 && (
          <Card
            flush
            title="3. Kiểm tra & tạo đơn"
            subtitle={`· ${valid.length} dòng hợp lệ${invalid ? `, ${invalid} dòng lỗi` : ''}`}
            actions={
              <Button variant="primary" size="sm" disabled={!valid.length || submit.isPending || submit.isSuccess} onClick={() => submit.mutate(valid.map(r => toBatchOrder(r.data, { service, hub, branch })))}>
                {submit.isPending ? 'Đang tạo…' : `Tạo ${valid.length} đơn`}
              </Button>
            }
          >
            {invalid > 0 && <div className={styles.pad}><Notice tone="warning">Dòng lỗi sẽ bị bỏ qua. Sửa trong file rồi tải lên lại nếu cần.</Notice></div>}
            {submit.isError && <div className={styles.pad}><Notice tone="danger">{getErrorMessage(submit.error)}</Notice></div>}
            {submit.isSuccess && (
              <div className={styles.pad}>
                <Notice tone="success" title={submit.data.message ?? `Đã tạo ${valid.length} đơn`}>
                  Đơn đã được cấp mã bill. <LinkButton to="/orders" size="sm" variant="ghost">Xem trong Đơn hàng của tôi</LinkButton>
                </Notice>
              </div>
            )}
            <DataTable caption="Xem trước dữ liệu" columns={columns} rows={rows} rowKey={r => String(r.line)} minWidth={960} />
          </Card>
        )}
      </div>
    </>
  );
}
