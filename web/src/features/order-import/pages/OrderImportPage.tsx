import { useState } from 'react';
import { getErrorMessage } from '@/shared/api/http';
import { BRANCHES, CARRIERS, defaultHub, hubOptions } from '@/shared/config/domain';
import { Button, Card, DataTable, FileDrop, FormGrid, Icon, LinkButton, Notice, PageHeader, SelectField, StatusPill, type Column } from '@/shared/ui';
import { useCommitImport, usePreviewImport } from '../api';
import { IMPORT_GUIDE, IMPORT_LIMITS, IMPORT_TEMPLATE_URL } from '../constants';
import { checkImportFile, formatKg, formatMoney, rowState, serviceHubError, sortRows } from '../lib/import-rows';
import type { ImportDefaults, ImportResult, ImportRow } from '../types';
import styles from './OrderImportPage.module.css';

const TEMPLATE_NAME = 'Mau_Excel_Tao_Don.xlsx';

export default function OrderImportPage() {
  const [defaults, setDefaults] = useState<ImportDefaults>({ service: '', hub: '', branch: 'TP.HCM' });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  const preview = usePreviewImport();
  const commit = useCommitImport();
  const hubError = serviceHubError(defaults);
  const created = (result?.created ?? 0) > 0;

  const check = (f: File) => {
    commit.reset();
    setResult(null);
    preview.mutate({ file: f, defaults }, { onSuccess: res => setResult(res.data) });
  };

  const onFile = (f: File) => {
    setFile(f);
    setResult(null);
    preview.reset();
    commit.reset();
    const error = checkImportFile(f);
    setFileError(error ?? '');
    if (!error) check(f);
  };

  const create = () => {
    if (!file || hubError) return;
    commit.mutate({ file, defaults }, { onSuccess: res => setResult(res.data) });
  };

  const setService = (service: string) => setDefaults(d => ({ ...d, service, hub: defaultHub(service) }));

  const columns: ReadonlyArray<Column<ImportRow>> = [
    { key: 'line', header: 'Dòng', width: 56, align: 'center', render: r => r.line },
    { key: 'ref', header: 'Ref_No', render: r => r.ref || <span className={styles.muted}>—</span> },
    { key: 'type', header: 'Loại', className: styles.nowrap, render: r => (r.type === 'DOC' ? 'Chứng từ' : 'Hàng hoá') },
    {
      key: 'cnee',
      header: 'Người nhận',
      render: r => (
        <div className={styles.cnee}>
          <strong>{r.consignee || '—'}</strong>
          <span className={styles.muted}>{[r.city, r.countryCode].filter(Boolean).join(', ')}</span>
        </div>
      )
    },
    { key: 'pcs', header: 'Kiện', width: 56, align: 'right', render: r => r.pieces },
    { key: 'gw', header: 'Cân thực', align: 'right', className: styles.nowrap, render: r => formatKg(r.weightKg) },
    { key: 'cw', header: 'Cân tính cước', align: 'right', className: styles.nowrap, render: r => <strong>{formatKg(r.chargeableKg)}</strong> },
    { key: 'value', header: 'Giá trị', align: 'right', className: styles.nowrap, render: r => formatMoney(r.value, r.currency) },
    { key: 'products', header: 'Mặt hàng', width: 72, align: 'right', render: r => r.products || '—' },
    { key: 'result', header: 'Kết quả', width: '30%', render: r => <RowResult row={r} /> }
  ];

  return (
    <>
      <PageHeader
        title="Tạo đơn từ Excel"
        description="Tạo nhiều đơn cùng lúc từ file Excel mẫu: chọn dịch vụ (nếu cần) → tải file lên → kiểm tra → tạo đơn."
        actions={
          <LinkButton to={IMPORT_TEMPLATE_URL} reloadDocument download={TEMPLATE_NAME} size="sm">
            <Icon name="download" size={15} /> Tải file mẫu
          </LinkButton>
        }
      />
      <div className="page-stack">
        <Card title="1. Dịch vụ áp cho cả file" subtitle="(không bắt buộc)">
          <FormGrid columns={3}>
            <SelectField
              label="Dịch vụ"
              placeholder="Không chọn — theo file"
              options={CARRIERS}
              value={defaults.service}
              onChange={e => setService(e.target.value)}
            />
            <SelectField
              label="Hub"
              placeholder="Chọn hub"
              required={!!defaults.service}
              disabled={!defaults.service}
              options={hubOptions(defaults.service)}
              value={defaults.hub}
              error={hubError ?? undefined}
              onChange={e => setDefaults(d => ({ ...d, hub: e.target.value }))}
            />
            <SelectField label="Chi nhánh gửi" options={BRANCHES} value={defaults.branch} onChange={e => setDefaults(d => ({ ...d, branch: e.target.value }))} />
          </FormGrid>
          <p className={styles.hint}>Không bắt buộc chọn dịch vụ, nhưng nếu đã chọn dịch vụ thì cần chọn hub. Dịch vụ chọn ở đây áp cho mọi đơn trong file.</p>
        </Card>

        <Card title="2. Tải file lên">
          <FileDrop
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onFile={onFile}
            disabled={preview.isPending || commit.isPending}
            title={file?.name ?? 'Kéo & thả file Excel hoặc bấm để chọn'}
            hint={`File .xlsx theo mẫu · tối đa ${IMPORT_LIMITS.maxRows} đơn / lần, ${IMPORT_LIMITS.maxMb} MB`}
          />
          <p className={styles.hint}>
            Chưa có file? <a href={IMPORT_TEMPLATE_URL} download={TEMPLATE_NAME}>Tải xuống file mẫu import</a> — điền từ dòng 3 của sheet DATA, giữ nguyên dòng tiêu đề.
          </p>
          {fileError && <Notice tone="danger">{fileError}</Notice>}
          {preview.isPending && <Notice tone="info">Đang kiểm tra file…</Notice>}
          {preview.isError && <Notice tone="danger">{getErrorMessage(preview.error)}</Notice>}
        </Card>

        {result && (
          <Card
            flush
            title="3. Kiểm tra & tạo đơn"
            subtitle={`· ${result.total} dòng: ${result.valid} hợp lệ${result.invalid ? `, ${result.invalid} lỗi` : ''}`}
            actions={
              <div className={styles.actions}>
                {!created && file && (
                  <Button size="sm" onClick={() => check(file)} disabled={preview.isPending || commit.isPending}>
                    <Icon name="refresh" size={15} /> Kiểm tra lại
                  </Button>
                )}
                <Button variant="primary" size="sm" disabled={!result.valid || !!hubError || commit.isPending || created} onClick={create}>
                  {commit.isPending ? 'Đang tạo đơn…' : created ? `Đã tạo ${result.created} đơn` : `Tạo ${result.valid} đơn`}
                </Button>
              </div>
            }
          >
            <div className={styles.pad}>
              {created ? (
                <Notice tone="success" title={`Đã tạo ${result.created} đơn và cấp số vận đơn`}>
                  Đơn nằm trong "Đơn hàng của tôi" — in bill, invoice ngay tại đó.{' '}
                  <LinkButton to="/orders" size="sm" variant="ghost">Xem đơn hàng</LinkButton>
                </Notice>
              ) : result.invalid > 0 ? (
                <Notice tone="warning">
                  {result.valid ? `Chỉ ${result.valid} dòng hợp lệ được tạo đơn; dòng lỗi bị bỏ qua.` : 'Chưa có dòng nào hợp lệ.'} Sửa lỗi trong file rồi tải lên lại.
                </Notice>
              ) : (
                <Notice tone="success">Tất cả dòng hợp lệ. Kiểm tra cảnh báo (nếu có) rồi bấm "Tạo {result.valid} đơn".</Notice>
              )}
              {commit.isError && <Notice tone="danger">{getErrorMessage(commit.error)}</Notice>}
            </div>
            <DataTable caption="Kết quả kiểm tra từng dòng" columns={columns} rows={sortRows(result.rows)} rowKey={r => String(r.line)} minWidth={1080} />
          </Card>
        )}

        <Card>
          <details className={styles.guide}>
            <summary>Hướng dẫn điền file mẫu</summary>
            <p>
              Công cụ giúp tạo nhiều đơn cùng lúc: điền file mẫu, tải lên, hệ thống kiểm tra từng dòng rồi tạo đơn cho các dòng hợp lệ.
              Mỗi đơn là 1 dòng trong sheet <strong>DATA</strong>, dữ liệu bắt đầu từ dòng 3 (dòng 2 là chú thích).
            </p>
            {IMPORT_GUIDE.map(section => (
              <section key={section.title}>
                <h3>{section.title}</h3>
                <table className={styles.guideTable}>
                  <thead>
                    <tr><th>Cột</th><th>Mô tả</th></tr>
                  </thead>
                  <tbody>
                    {section.columns.map(c => (
                      <tr key={c.name}>
                        <td><code>{c.name}</code></td>
                        <td>{c.description}{c.required && <strong className={styles.required}> — bắt buộc</strong>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {section.note && <p className={styles.note}>{section.note}</p>}
              </section>
            ))}
            <h3>Quy trình thực hiện</h3>
            <ol>
              <li>Tải file mẫu Excel.</li>
              <li>Điền đầy đủ thông tin vào các cột theo hướng dẫn trên.</li>
              <li>Chọn dịch vụ / hub nếu muốn áp cho cả file, rồi tải file lên.</li>
              <li>Xem kết quả kiểm tra, sửa dòng lỗi (nếu có).</li>
              <li>Bấm "Tạo đơn" — đơn được cấp số vận đơn và có trong "Đơn hàng của tôi".</li>
            </ol>
          </details>
        </Card>
      </div>
    </>
  );
}

function RowResult({ row }: { row: ImportRow }) {
  const state = rowState(row);
  return (
    <div className={styles.result}>
      {state === 'created' && <StatusPill tone="success">Bill {row.bill}</StatusPill>}
      {state === 'ok' && <StatusPill tone="brand">Hợp lệ</StatusPill>}
      {row.errors.length > 0 && (
        <ul className={styles.errors}>
          {row.errors.map(e => <li key={e}>{e}</li>)}
        </ul>
      )}
      {row.warnings.length > 0 && (
        <ul className={styles.warnings}>
          {row.warnings.map(w => <li key={w}>{w}</li>)}
        </ul>
      )}
    </div>
  );
}
