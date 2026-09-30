import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import { CONTACTS } from '../constants';
import styles from './FloatingContact.module.css';

/** Nút gọi hotline và nhắn Zalo cố định góc phải dưới. */
export function FloatingContact() {
  const { t } = useI18n();
  return (
    <div className={styles.wrap}>
      <a href={CONTACTS.zalo.href} target="_blank" rel="noreferrer" className={styles.zalo} aria-label={t('Nhắn Zalo cho Việt An')}>
        <img src="/landing/zalo.png" alt="" width={28} height={28} />
      </a>
      <a href={CONTACTS.hotline.href} className={styles.call} aria-label={t('Gọi hotline {phone}', { phone: CONTACTS.hotline.label })}>
        <Icon name="phone" size={22} />
      </a>
    </div>
  );
}
