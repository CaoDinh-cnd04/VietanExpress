import { useEffect, useMemo, useState, type ClipboardEvent } from 'react';
import { useI18n } from '@/shared/i18n';
import { Button, Card, EmptyState, FileDrop, Icon, Notice, PageHeader, StatusPill, TextAreaField, TextField } from '@/shared/ui';
import { feedbackImageUrl, useDeleteFeedback, useMyFeedback, useSendFeedback } from '../api';
import { StarRating, Stars } from '../components/Stars';
import { addImages, FEEDBACK_LIMITS, formatSize } from '../lib/images';
import styles from './FeedbackPage.module.css';

/** Tài khoản → Góp ý: khách gửi nội dung + tối đa 5 ảnh (chọn, kéo thả hoặc dán ảnh chụp màn hình), xem góp ý đã gửi. */
export default function FeedbackPage() {
  const { t } = useI18n();
  const send = useSendFeedback();
  const remove = useDeleteFeedback();
  const [rating, setRating] = useState<number | null>(null);
  const mine = useMyFeedback();
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  // Ảnh xem trước (giải phóng bộ nhớ khi đổi danh sách).
  const previews = useMemo(() => images.map(f => URL.createObjectURL(f)), [images]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const add = (files: File[]) => {
    const r = addImages(images, files);
    setImages(r.files);
    setImageErrors(r.errors);
  };
  // Dán ảnh chụp màn hình (Ctrl+V) ở bất kỳ ô nào trong form.
  const onPaste = (e: ClipboardEvent) => {
    const files = [...e.clipboardData.files].filter(f => f.type.startsWith('image/'));
    if (files.length) {
      e.preventDefault();
      add(files.map((f, i) => (f.name && f.name !== 'image.png' ? f : new File([f], `anh-dan-${Date.now()}-${i}.png`, { type: f.type }))));
    }
  };

  const messageError = touched && !message.trim() ? 'Nhập nội dung góp ý' : undefined;
  const submit = () => {
    setTouched(true);
    if (!message.trim()) return;
    send.mutate(
      { message: message.trim(), contact, rating, images },
      {
        onSuccess: () => {
          setMessage('');
          setContact('');
          setRating(null);
          setImages([]);
          setImageErrors([]);
          setTouched(false);
        }
      }
    );
  };

  return (
    <div className="page-stack">
      <PageHeader title="Góp ý" description="Gửi góp ý, báo lỗi hoặc đề xuất để Việt An phục vụ bạn tốt hơn." />

      <Card title="Gửi góp ý">
        <div className={styles.form} onPaste={onPaste}>
          <div className={styles.rating}>
            <span className={styles.label}>{t('Mức độ hài lòng với Việt An Express (không bắt buộc)')}</span>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <TextAreaField
            label="Nội dung góp ý"
            required
            rows={5}
            maxLength={FEEDBACK_LIMITS.messageMax}
            aside={`${message.length}/${FEEDBACK_LIMITS.messageMax}`}
            placeholder={t('Mô tả góp ý, lỗi gặp phải hoặc đề xuất của bạn…')}
            error={messageError}
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <TextField
            label="Liên hệ lại (không bắt buộc)"
            maxLength={FEEDBACK_LIMITS.contactMax}
            placeholder={t('Số điện thoại hoặc email nếu muốn Việt An liên hệ lại')}
            value={contact}
            onChange={e => setContact(e.target.value)}
          />

          <div className={styles.images}>
            <span className={styles.label}>{t('Ảnh đính kèm ({n}/{max})', { n: images.length, max: FEEDBACK_LIMITS.maxImages })}</span>
            {images.length < FEEDBACK_LIMITS.maxImages && (
              <FileDrop
                accept={FEEDBACK_LIMITS.imageTypes.join(',')}
                onFiles={add}
                title="Kéo & thả ảnh vào đây, bấm để chọn, hoặc dán ảnh (Ctrl+V)"
                hint={t('Tối đa {max} ảnh JPG, PNG, WEBP, GIF · mỗi ảnh ≤ 5 MB', { max: FEEDBACK_LIMITS.maxImages })}
              />
            )}
            {imageErrors.length > 0 && (
              <Notice tone="warning">{imageErrors.map(e => t(e, { max: FEEDBACK_LIMITS.maxImages })).join('. ')}</Notice>
            )}
            {images.length > 0 && (
              <ul className={styles.thumbs}>
                {images.map((f, i) => (
                  <li key={`${f.name}-${f.size}`} className={styles.thumb}>
                    <img src={previews[i]} alt={f.name} />
                    <span className={styles.thumbName} title={f.name}>{f.name}</span>
                    <span className={styles.thumbSize}>{formatSize(f.size)}</span>
                    <button
                      type="button"
                      className={styles.thumbRemove}
                      aria-label={t('Bỏ ảnh {name}', { name: f.name })}
                      onClick={() => setImages(images.filter((_, j) => j !== i))}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.actions}>
            <Button variant="primary" disabled={send.isPending} onClick={submit}>
              <Icon name="send" size={15} /> {t(send.isPending ? 'Đang gửi…' : 'Gửi góp ý')}
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Góp ý đã gửi">
        {mine.isLoading ? (
          <p className={styles.muted}>{t('Đang tải…')}</p>
        ) : !mine.data?.length ? (
          <EmptyState title="Chưa có góp ý nào" description="Góp ý bạn gửi sẽ hiện ở đây." />
        ) : (
          <ul className={styles.list}>
            {mine.data.map(f => (
              <li key={f.id} className={styles.item}>
                <div className={styles.itemHead}>
                  <span className={styles.itemWhen}>
                    <span className={styles.muted}>{f.createdAt}</span>
                    <Stars value={f.rating} />
                  </span>
                  <span className={styles.itemActions}>
                    <StatusPill tone={f.seen ? 'success' : 'neutral'}>{f.seen ? 'Việt An đã xem' : 'Đã gửi'}</StatusPill>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={remove.isPending}
                      aria-label={t('Xóa góp ý gửi lúc {time}', { time: f.createdAt })}
                      onClick={() => {
                        if (window.confirm(t('Xóa góp ý khỏi danh sách của bạn? Việt An vẫn lưu nội dung và ảnh đính kèm để tiếp nhận, xử lý.'))) remove.mutate(f.id);
                      }}
                    >
                      <Icon name="trash" size={14} /> {t('Xóa')}
                    </Button>
                  </span>
                </div>
                <p className={styles.message}>{f.message}</p>
                {f.contact && <p className={styles.muted}>{t('Liên hệ')}: {f.contact}</p>}
                {f.images.length > 0 && (
                  <div className={styles.sentImages}>
                    {f.images.map(img => (
                      <a key={img.id} href={feedbackImageUrl(img.id)} target="_blank" rel="noreferrer" title={img.fileName}>
                        <img src={feedbackImageUrl(img.id)} alt={img.fileName} loading="lazy" />
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
