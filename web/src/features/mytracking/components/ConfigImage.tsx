import { useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { isImageSource } from '../schema';
import styles from '../pages/MyTrackingPage.module.css';
export function ConfigImage({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState<string>();
  if (!isImageSource(src) || failed === src) return <span className={`${styles.imageError} ${className}`}>{t('Không tải được hình ảnh')}</span>;
  return <img className={className} src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(src)} />;
}
