import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_FILTERS } from '../constants';
import type { OrderFilters } from '../types';

type Key = keyof OrderFilters;
const NUMERIC_KEYS: ReadonlySet<Key> = new Set(['page', 'pageSize']);

/**
 * Bộ lọc đơn hàng lưu trên URL (?status=fly&page=2…):
 * chia sẻ được link, F5 không mất bộ lọc, nút Back hoạt động đúng.
 * Chỉ ghi các giá trị khác mặc định để URL gọn.
 */
export function useOrderFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<OrderFilters>(() => {
    const out: Record<string, unknown> = { ...DEFAULT_FILTERS };
    (Object.keys(DEFAULT_FILTERS) as Key[]).forEach(key => {
      const raw = params.get(key);
      if (raw === null) return;
      out[key] = NUMERIC_KEYS.has(key) ? Number(raw) || DEFAULT_FILTERS[key] : raw;
    });
    return out as unknown as OrderFilters;
  }, [params]);

  /** Cập nhật một phần bộ lọc; đổi điều kiện lọc thì về trang 1. */
  const update = useCallback(
    (patch: Partial<OrderFilters>) => {
      const next: OrderFilters = { ...filters, ...patch };
      if (!('page' in patch)) next.page = 1;
      const search = new URLSearchParams();
      (Object.keys(next) as Key[]).forEach(key => {
        if (next[key] !== DEFAULT_FILTERS[key]) search.set(key, String(next[key]));
      });
      setParams(search, { replace: true });
    },
    [filters, setParams]
  );

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);

  return { filters, update, reset };
}
