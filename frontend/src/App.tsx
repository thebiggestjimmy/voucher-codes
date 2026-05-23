import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { api } from './api';
import type { Category, Site, SortKey, Voucher } from './types';
import { VoucherCard } from './components/VoucherCard';
import { AddVoucherModal } from './components/AddVoucherModal';
import { AddCategoryModal } from './components/AddCategoryModal';

type Toast = { message: string; tone: 'info' | 'error' } | null;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('top');
  const [includeExpired, setIncludeExpired] = useState(false);

  const [showAddVoucher, setShowAddVoucher] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);

  const debouncedSearch = useDebounced(search, 250);

  const showToast = useCallback((message: string, tone: 'info' | 'error' = 'info') => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const loadCategoriesAndSites = useCallback(async () => {
    const [cats, allSites] = await Promise.all([api.listCategories(), api.listSites()]);
    setCategories(cats);
    setSites(allSites);
  }, []);

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const results = await api.listVouchers({
        categoryId: selectedCategory ?? undefined,
        search: debouncedSearch || undefined,
        includeExpired,
        sort,
      });
      setVouchers(results);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load vouchers', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, debouncedSearch, includeExpired, sort, showToast]);

  useEffect(() => {
    loadCategoriesAndSites().catch((err) =>
      showToast(err instanceof Error ? err.message : 'Failed to load data', 'error'),
    );
  }, [loadCategoriesAndSites, showToast]);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  const totalVouchers = vouchers.length;
  const allCategoryCount = useMemo(
    () => categories.reduce((sum, c) => sum + c.siteCount, 0),
    [categories],
  );

  const handleVote = async (voucher: Voucher, direction: 'up' | 'down') => {
    try {
      const updated = await api.voteVoucher(voucher.id, direction);
      setVouchers((prev) => {
        const next = prev.map((v) => (v.id === updated.id ? updated : v));
        if (sort === 'top') {
          next.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
        }
        return next;
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Vote failed', 'error');
    }
  };

  const handleVoucherCreated = (voucher: Voucher, newSite?: Site) => {
    setShowAddVoucher(false);
    if (newSite) {
      setSites((prev) => [...prev, newSite]);
    }
    setVouchers((prev) => [voucher, ...prev]);
    loadCategoriesAndSites();
    showToast(`Voucher ${voucher.code} added for ${voucher.siteName}`);
  };

  const handleCategoryCreated = (category: Category) => {
    setShowAddCategory(false);
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
    showToast(`Category "${category.name}" added`);
  };

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <div className="app__logo">V</div>
          <div>
            <h1 className="app__title">VoucherVault</h1>
            <p className="app__subtitle">Find &amp; share discount codes for your favourite sites</p>
          </div>
        </div>
        <div className="app__header-actions">
          <button className="btn" onClick={() => setShowAddCategory(true)}>
            + Category
          </button>
          <button className="btn btn--primary" onClick={() => setShowAddVoucher(true)}>
            + Submit code
          </button>
        </div>
      </header>

      <div className="app__body">
        <aside className="sidebar">
          <div className="sidebar__header">
            <p className="sidebar__title">Categories</p>
          </div>
          <ul className="sidebar__list">
            <li>
              <button
                className={`sidebar__item ${selectedCategory === null ? 'sidebar__item--active' : ''}`}
                onClick={() => setSelectedCategory(null)}
              >
                <span>
                  <span className="sidebar__dot" style={{ background: '#94a3b8' }} />
                  All categories
                </span>
                <span className="sidebar__count">{allCategoryCount}</span>
              </button>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <button
                  className={`sidebar__item ${selectedCategory === c.id ? 'sidebar__item--active' : ''}`}
                  onClick={() => setSelectedCategory(c.id)}
                >
                  <span>
                    <span className="sidebar__dot" style={{ background: c.color }} />
                    {c.name}
                  </span>
                  <span className="sidebar__count">{c.siteCount}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="main">
          <div className="toolbar">
            <div className="search">
              <input
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

          {loading ? (
            <div className="loading">
              <span className="spinner" /> Loading vouchers…
            </div>
          ) : totalVouchers === 0 ? (
            <div className="empty">
              <p className="empty__title">No vouchers found</p>
              <p>Try clearing your filters, or be the first to add one.</p>
              <div style={{ marginTop: 12 }}>
                <button className="btn btn--primary" onClick={() => setShowAddVoucher(true)}>
                  Submit a voucher
                </button>
              </div>
            </div>
          ) : (
            <div className="voucher-list">
              {vouchers.map((v) => (
                <VoucherCard key={v.id} voucher={v} onVote={(d) => handleVote(v, d)} />
              ))}
            </div>
          )}
        </main>
      </div>

      {showAddVoucher && (
        <AddVoucherModal
          categories={categories}
          sites={sites}
          defaultCategoryId={selectedCategory ?? undefined}
          onClose={() => setShowAddVoucher(false)}
          onCreated={handleVoucherCreated}
        />
      )}
      {showAddCategory && (
        <AddCategoryModal
          onClose={() => setShowAddCategory(false)}
          onCreated={handleCategoryCreated}
        />
      )}

      {toast && (
        <div className={`toast ${toast.tone === 'error' ? 'toast--error' : ''}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;
