import { useState } from 'react';
import { getErrorMessage } from '@/shared/api/http';
import { useI18n } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { Icon, SegmentedControl, useToast } from '@/shared/ui';
import { useDeleteProduct, useFavoriteProduct, type SavedProduct } from '../api';
import { filterProducts } from '../lib/product-library';
import styles from './ProductLibraryList.module.css';

interface ProductLibraryListProps {
  products: readonly SavedProduct[];
  onPick: (p: SavedProduct) => void;
}

type Tab = 'all' | 'favorite';

/**
 * Danh sách thư viện mặt hàng: tab Tất cả / Yêu thích, ô tìm, đánh dấu sao (lên đầu thư viện)
 * và xóa khỏi thư viện (chỉ ẩn — đơn cũ giữ nguyên). Lưu trong dbo.MatHangKhachHang.
 * Bấm vào dòng để thêm mặt hàng vào invoice.
 */
export function ProductLibraryList({ products, onPick }: ProductLibraryListProps) {
  const { t } = useI18n();
  const toast = useToast();
  const favorite = useFavoriteProduct();
  const remove = useDeleteProduct();
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const favorites = products.filter(p => p.isFavorite).length;
  const shown = filterProducts(products, query, tab === 'favorite');

  const fail = (e: unknown) => toast.show(getErrorMessage(e), 'error');

  const toggleStar = (p: SavedProduct) => {
    if (p.id) favorite.mutate({ id: p.id, isFavorite: !p.isFavorite }, { onError: fail });
  };

  const del = (p: SavedProduct) => {
    if (!p.id || !window.confirm(t('Xóa "{name}" khỏi thư viện? Các đơn đã khai mặt hàng này không bị ảnh hưởng.', { name: p.descEn || p.descVi }))) return;
    remove.mutate(p.id, { onSuccess: res => toast.show(res.message, 'success'), onError: fail });
  };

  return (
    <>
      <div className={styles.bar}>
        <SegmentedControl<Tab>
          ariaLabel="Lọc thư viện mặt hàng"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: `${t('Tất cả')} (${products.length})` },
            { value: 'favorite', label: `${t('Yêu thích')} (${favorites})` }
          ]}
        />
        <label className={styles.search}>
          <Icon name="search" size={15} />
          <input placeholder={t('Tìm tên hàng, mã HS…')} aria-label={t('Tìm mặt hàng')} value={query} onChange={e => setQuery(e.target.value)} />
        </label>
      </div>

      {!shown.length ? (
        <p className={styles.empty}>
          {t(tab === 'favorite' && !query ? 'Chưa có mặt hàng yêu thích — bấm ngôi sao cạnh mặt hàng để đánh dấu.' : 'Không có mặt hàng phù hợp.')}
        </p>
      ) : (
        <ul className={styles.list}>
          {shown.map(p => (
            <li key={p.id ?? p.descEn} className={styles.row}>
              <button
                type="button"
                className={cx(styles.icon, styles.star, p.isFavorite && styles.starOn)}
                disabled={!p.id}
                aria-pressed={!!p.isFavorite}
                aria-label={t(p.isFavorite ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích')}
                title={t(p.isFavorite ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích — mặt hàng hiện lên đầu thư viện')}
                onClick={() => toggleStar(p)}
              >
                <Icon name="star" size={16} />
              </button>
              <button type="button" className={styles.pick} onClick={() => onPick(p)}>
                <span className={styles.text}>
                  <span className={styles.name}>
                    {p.descEn}
                    {p.descVi && <span className={styles.vi}> / {p.descVi}</span>}
                  </span>
                  <span className={styles.meta}>
                    HS {p.hs || '—'} · {p.origin} · {p.unit}
                    {p.price ? ` · ${p.price}` : ''}
                    {p.manufacturer ? ` · ${p.manufacturer}` : ''}
                  </span>
                </span>
                <span className={styles.add}>
                  <Icon name="plus" size={14} /> {t('Thêm')}
                </span>
              </button>
              <button
                type="button"
                className={cx(styles.icon, styles.delete)}
                disabled={remove.isPending || !p.id}
                aria-label={t('Xóa {name} khỏi thư viện', { name: p.descEn || p.descVi })}
                title={t('Xóa khỏi thư viện')}
                onClick={() => del(p)}
              >
                <Icon name="trash" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
