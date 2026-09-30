import { useState } from 'react';
import { FormProvider, useWatch, type FieldErrors } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/shared/api/http';
import { useI18n } from '@/shared/i18n';
import { Button, Card, LinkButton, PageHeader, SegmentedControl, useToast } from '@/shared/ui';
import { DraftsTable, useSaveDraft, useUpdateDraft } from '@/features/drafts';
import { useQuote, type ServiceQuote } from '@/features/pricing';
import { AddonsSection } from '../components/AddonsSection';
import { GoodsSection } from '../components/GoodsSection';
import { HelpLinksMenu } from '../components/HelpLinksMenu';
import { InvoiceSection } from '../components/InvoiceSection';
import { PackagesTable } from '../components/PackagesTable';
import { ReceiverSection } from '../components/ReceiverSection';
import { ServiceSection } from '../components/ServiceSection';
import { ShipmentSection } from '../components/ShipmentSection';
import { ShipperSection } from '../components/ShipperSection';
import { StepIndicator } from '../components/StepIndicator';
import { SurchargeConfirmDialog } from '../components/SurchargeConfirmDialog';
import { WIZARD_STEPS, WIZARD_STEPS_DOC } from '../constants';
import { useCreateOrderForm } from '../hooks/useCreateOrderForm';
import { readAutosave, useOrderPrefill } from '../hooks/useOrderPrefill';
import { useShipmentSync } from '../hooks/useShipmentSync';
import { evaluatePackages, hasCritical, type PackageWarning } from '../lib/carrier-limits';
import { buildDraftPayload, summarizePackages, toNumber } from '../lib/shipment';
import { STEP_FIELDS, type CreateOrderValues } from '../schema';
import styles from './CreateOrderPage.module.css';

export type CreateMode = 'wizard' | 'quick';

const MODE_OPTIONS = [
  { value: 'wizard', label: 'Từng bước' },
  { value: 'quick', label: '1 trang' }
] as const;

const MODE_ROUTES: Record<CreateMode, string> = { wizard: '/orders/new', quick: '/orders/new/quick' };
const PACKAGES_STEP = 1;

/** Cuộn tới ô lỗi đầu tiên sau khi kiểm tra không đạt. */
const focusFirstError = () =>
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus({ preventScroll: true });
  });

/**
 * Trang tạo đơn. Hai chế độ dùng chung một form và các khối con:
 * - wizard: 3 bước, kiểm tra từng bước trước khi sang bước sau.
 * - quick : mọi khối trên 1 trang, kèm bảng đơn nháp bên dưới.
 * Tạo đơn = lưu vào "Đơn nháp & chưa in" (status 'ready'); bấm In ở đó mới cấp mã bill.
 * Dữ liệu tự lưu trong phiên nên chuyển chế độ / tải lại trang không mất.
 */
export default function CreateOrderPage({ mode }: { mode: CreateMode }) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const toast = useToast();
  const { t } = useI18n();
  const [initial] = useState(() => (search ? undefined : readAutosave()));
  const form = useCreateOrderForm(initial);
  const { draftId, finishAutosave } = useOrderPrefill(form);
  const { onShipmentInput, onPackagesInput, onTypeChange, docConverted } = useShipmentSync(form);
  const saveDraft = useSaveDraft();
  const updateDraft = useUpdateDraft();
  const quote = useQuote();
  const [step, setStep] = useState(0);
  const [confirm, setConfirm] = useState<{ quote: ServiceQuote | null; warnings: PackageWarning[] } | null>(null);

  const isWizard = mode === 'wizard';
  // Chứng từ (DOC): chỉ khai nội dung — ẩn bảng kiện và Invoice, wizard còn 2 bước. Hàng hoá (PACK): đủ 3 bước.
  const isPack = useWatch({ control: form.control, name: 'shipment.type' }) === 'PACK';
  const steps = isPack ? WIZARD_STEPS : WIZARD_STEPS_DOC;
  const lastStep = steps.length - 1;
  const current = Math.min(step, lastStep); // đang ở bước Invoice mà đổi sang DOC → lùi về bước cuối
  const showStep = (i: number) => !isWizard || current === i;
  const saving = saveDraft.isPending || updateDraft.isPending;

  const goToStep = async (target: number) => {
    // Lùi bước luôn được; tiến bước phải qua kiểm tra các bước đang đứng
    if (target > current) {
      for (let s = current; s < target; s++) {
        const ok = await form.trigger([...STEP_FIELDS[s]!]);
        if (!ok) {
          setStep(s);
          focusFirstError();
          return;
        }
      }
    }
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const persist = (values: CreateOrderValues, status: 'draft' | 'ready') => {
    const payload = buildDraftPayload(values, status);
    const onSuccess = () => {
      finishAutosave();
      setConfirm(null);
      toast.show(status === 'ready' ? 'Đã tạo đơn. Bấm "In & cấp bill" để cấp mã bill.' : 'Đã lưu nháp.', 'success');
      navigate('/drafts');
    };
    const onError = (e: unknown) => toast.show(getErrorMessage(e, 'Không lưu được đơn, vui lòng thử lại'), 'error');
    if (draftId) updateDraft.mutate({ id: draftId, draft: payload }, { onSuccess, onError });
    else saveDraft.mutate(payload, { onSuccess, onError });
  };

  /** Trước khi tạo: chặn kiện hãng không nhận; hỏi xác nhận nếu có phụ phí / cảnh báo. */
  const onValid = async (values: CreateOrderValues) => {
    const isPack = values.shipment.type === 'PACK';
    const warnings = isPack ? evaluatePackages(values.service.carrier, values.packages) : [];
    if (hasCritical(warnings)) {
      if (isWizard) setStep(PACKAGES_STEP);
      toast.show('Có kiện vượt giới hạn nhận của hãng — vui lòng chia nhỏ kiện hoặc đổi dịch vụ.', 'error');
      return;
    }

    let matched: ServiceQuote | null = null;
    if (isPack) {
      const longest = Math.max(0, ...values.packages.map(p => Math.max(toNumber(p.length), toNumber(p.width), toNumber(p.height))));
      const biggest = values.packages.find(p => Math.max(toNumber(p.length), toNumber(p.width), toNumber(p.height)) === longest);
      try {
        const rates = await quote.mutateAsync({
          country: values.receiver.country,
          weight: summarizePackages(values.packages).grossWeight || toNumber(values.shipment.grossWeight),
          type: 'PACK',
          length: toNumber(biggest?.length),
          width: toNumber(biggest?.width),
          height: toNumber(biggest?.height)
        });
        matched = rates.find(r => r.name === values.service.carrier || values.service.carrier.startsWith(r.name)) ?? null;
      } catch {
        // Không tra được giá thì vẫn cho tạo đơn — phụ phí sẽ được CS xác nhận sau
      }
    }

    const notable = warnings.filter(w => w.level === 'warning');
    if (matched?.hasSurcharge || notable.length) setConfirm({ quote: matched, warnings: notable });
    else persist(values, 'ready');
  };

  const onInvalid = (errors: FieldErrors<CreateOrderValues>) => {
    if (isWizard) {
      const firstBad = STEP_FIELDS.findIndex(fields => fields.some(f => errors[f]));
      if (firstBad >= 0) setStep(firstBad);
    }
    toast.show('Còn ô bắt buộc chưa điền — đã tô đỏ giúp bạn', 'error');
    focusFirstError();
  };

  const submit = form.handleSubmit(onValid, onInvalid);
  const saveAsDraft = () => persist(form.getValues(), 'draft');
  const busy = saving || quote.isPending;

  return (
    <FormProvider {...form}>
      <PageHeader
        title={draftId ? 'Sửa đơn nháp' : 'Tạo đơn hàng'}
        description={isWizard ? t('{n} bước · tự lưu trong phiên', { n: steps.length }) : 'Điền tất cả trên 1 trang · tự lưu trong phiên'}
        actions={
          <>
            <HelpLinksMenu />
            <SegmentedControl ariaLabel="Chế độ tạo đơn" options={MODE_OPTIONS} value={mode} onChange={m => navigate(MODE_ROUTES[m] + search)} />
          </>
        }
      />

      {isWizard && <StepIndicator steps={steps} current={current} onSelect={i => void goToStep(i)} />}

      <form className={styles.form} onSubmit={e => void submit(e)} noValidate>
        {showStep(0) && (
          <div className={styles.billGrid}>
            <div className={styles.column}>
              <ShipperSection />
              <ServiceSection />
              <ShipmentSection onShipmentInput={onShipmentInput} onTypeChange={onTypeChange} docConverted={docConverted} />
            </div>
            <div className={styles.column}>
              <ReceiverSection />
            </div>
          </div>
        )}

        {showStep(1) && (
          <>
            <GoodsSection />
            {isPack && <PackagesTable onPackagesInput={onPackagesInput} />}
            <AddonsSection />
          </>
        )}

        {isPack && showStep(2) && <InvoiceSection />}

        <footer className={styles.footer}>
          {isWizard && current > 0 && <Button onClick={() => void goToStep(current - 1)}>{t('Quay lại')}</Button>}
          <Button variant="ghost" onClick={saveAsDraft} disabled={busy}>{t('Lưu nháp')}</Button>
          <span className={styles.spacer} />
          {isWizard && current < lastStep ? (
            <Button variant="primary" onClick={() => void goToStep(current + 1)}>
              {t('Tiếp tục: {step}', { step: t(steps[current + 1]!.title) })}
            </Button>
          ) : (
            <Button variant="primary" type="submit" disabled={busy}>
              {t(quote.isPending ? 'Đang kiểm tra phụ phí…' : saving ? 'Đang lưu…' : draftId ? 'Lưu & sẵn sàng in' : 'Tạo đơn hàng')}
            </Button>
          )}
        </footer>
      </form>

      {!isWizard && (
        <Card flush title="Đơn nháp & chưa in" subtitle="· bấm In để cấp mã bill" actions={<LinkButton to="/drafts" size="sm" variant="ghost">{t('Mở trang đầy đủ')}</LinkButton>} className={styles.drafts}>
          <DraftsTable limit={10} />
        </Card>
      )}

      <SurchargeConfirmDialog
        open={!!confirm}
        quote={confirm?.quote ?? null}
        warnings={confirm?.warnings ?? []}
        busy={saving}
        onCancel={() => setConfirm(null)}
        onConfirm={() => persist(form.getValues(), 'ready')}
      />
    </FormProvider>
  );
}
