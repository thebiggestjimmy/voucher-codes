import { useCallback, useEffect, useRef, useState } from 'react';
import { api, UnauthorizedError } from '../api';
import type { SortKey, Voucher } from '../types';
import { VoucherCard } from './VoucherCard';

interface Props {
  filter: { categoryId?: number; siteId?: number };
  showToolbar?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  isAdmin: boolean;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  /** When provided, the toolbar's search box mirrors this value (kept in sync via onSearchChange). */
  controlledSearch?: string;
  onSearchChange?: (value: string) => void;
  onError: (msg: string) => void;
  onLoaded?: (vouchers: Voucher[]) => void;
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function VoucherList({
  filter,
  showToolbar = true,
  emptyTitle = 'No vouchers found',
  emptyBody = 'Try clearing your filters, or be the first to add one.',
  isAdmin,
  searchInputRef,
  controlledSearch,
  onSearchChange,
  onError,
  onLoaded,
}: Props) {
  const [internalSearch, setInternalSearch] = useState(
    () => new URLSearchParams(window.location.search).get('q') ?? '',
  );
  const search = controlledSearch ?? internalSearch;
  const setSearch = (value: string) => {
    if (onSearchChange) onSearchChange(value);
    else setInternalSearch(value);
  };
  const [sort, setSort] = useState<SortKey>('top');
  const [includeExpired, setIncludeExpired] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  const debouncedSearch = useDebounced(search, 250);

  // Keep callbacks in refs so passing fresh inline callbacks doesn't retrigger fetches.
  const onLoadedRef = useRef(onLoaded);
  const onErrorRef = useRef(onError);
  useEffect(() => { onLoadedRef.current = onLoaded; }, [onLoaded]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await api.listVouchers({
        categoryId: filter.categoryId,
        siteId: filter.siteId,
        search: debouncedSearch || undefined,
        includeExpired,
        sort,
      });
      setVouchers(results);
      onLoadedRef.current?.(results);
    } catch (err) {
      if (!(err instanceof UnauthorizedError)) {
        onErrorRef.current(err instanceof Error ? err.message : 'Failed to load vouchers');
      }
    } finally {
      setLoading(false);
    }
  }, [filter.categoryId, filter.siteId, debouncedSearch, includeExpired, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVote = async (voucher: Voucher, direction: 'up' | 'down') => {
    try {
      const updated = await api.voteVoucher(voucher.id, direction);
      setVouchers((prev) => {
        const next = prev.map((v) => (v.id === updated.id ? updated : v));
        if (sort === 'top') {
          next.sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes));
        }
        return next;
      });
    } catch (err) {
      onErrorRef.current(err instanceof Error ? err.message : 'Vote failed');
    }
  };

  const handleRedeem = async (voucher: Voucher) => {
    setVouchers((prev) =>
      prev.map((v) => (v.id === voucher.id ? { ...v, redeemCount: v.redeemCount + 1 } : v)),
    );
    try {
      const updated = await api.redeemVoucher(voucher.id);
      setVouchers((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    } catch {
      setVouchers((prev) =>
        prev.map((v) =>
          v.id === voucher.id ? { ...v, redeemCount: Math.max(0, v.redeemCount - 1) } : v,
        ),
      );
    }
  };

  const handleAdminDelete = async (voucher: Voucher) => {
    if (!confirm(`Delete voucher ${voucher.code}?`)) return;
    try {
      await api.deleteVoucher(voucher.id);
      setVouchers((prev) => prev.filter((v) => v.id !== voucher.id));
    } catch (err) {
      onErrorRef.current(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <>
      {showToolbar && (
        <div className="toolbar">
          <div className="search">
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code, site, or description"
            />
          </div>
          <select
            className="select"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="top">Top voted</option>
            <option value="popular">Most used</option>
            <option value="new">Newest</option>
            <option value="expiring">Expiring soon</option>
          </select>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={includeExpired}
              onChange={(e) => setIncludeExpired(e.target.checked)}
            />
            Include expired
          </label>
        </div>
      )}

      {loading ? (
        <div className="loading">
          <span className="spinner" /> Loading vouchers…
        </div>
      ) : vouchers.length === 0 ? (
        <div className="empty">
          <p className="empty__title">{emptyTitle}</p>
          <p>{emptyBody}</p>
        </div>
      ) : (
        <div className="voucher-list">
          {vouchers.map((v) => (
            <VoucherCard
              key={v.id}
              voucher={v}
              isAdmin={isAdmin}
              onVote={(d) => handleVote(v, d)}
              onRedeem={() => handleRedeem(v)}
              onDelete={() => handleAdminDelete(v)}
            />
          ))}
        </div>
      )}
    </>
  );
}
