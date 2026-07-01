import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { api } from './api';
import type { Category, Site, SortKey, Voucher } from './types';
import { VoucherCard } from './components/VoucherCard';
import { AddVoucherModal } from './components/AddVoucherModal';
import { AddCategoryModal } from './components/AddCategoryModal';
import { Logo } from './components/Logo';
import { RegionSwitcher } from './components/RegionSwitcher';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { Footer } from './components/Footer';
import { detectRegion } from './region';
import { useRegionalSeo } from './seo';

type Toast = { message: string; tone: 'info' | 'error' } | null;
type View = 'public' | 'review';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function App() {
  const [region] = useState(detectRegion);
  useRegionalSeo(region);

  const [view, setView] = useState<View>('public');
  const [pendingCount, setPendingCount] = useState(0);

  const [categories, setCategories] = useState<Category[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [totalCodes, setTotalCodes] = useState(0);

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  // Seed the search from ?q= so the structured-data Sitelinks Searchbox works.
  const [search, setSearch] = useState(
    () => new URLSearchParams(window.location.search).get('q') ?? '',
  );
  const [sort, setSort] = useState<SortKey>('top');
  const [includeExpired, setIncludeExpired] = useState(false);

  const [showAddVoucher, setShowAddVoucher] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);

  const browseRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
        categoryId: view === 'public' ? (selectedCategory ?? undefined) : undefined,
        search: view === 'public' ? (debouncedSearch || undefined) : undefined,
        includeExpired: view === 'review' ? true : includeExpired,
        sort: view === 'review' ? 'new' : sort,
        status: view === 'review' ? 'pending' : 'approved',
      });
      setVouchers(results);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load vouchers', 'error');
    } finally {
      setLoading(false);
    }
  }, [view, selectedCategory, debouncedSearch, includeExpired, sort, showToast]);

  const refreshPendingCount = useCallback(async () => {
    try {
      const { count } = await api.pendingCount();
      setPendingCount(count);
    } catch {
      // ignore
    }
  }, []);

  // Unfiltered total used for the hero "live codes" stat (non-critical).
  const refreshTotalCodes = useCallback(async () => {
    try {
      const all = await api.listVouchers({ includeExpired: true });
      setTotalCodes(all.length);
    } catch {
      // hero just shows what it can
    }
  }, []);

  useEffect(() => {
    loadCategoriesAndSites().catch((err) =>
      showToast(err instanceof Error ? err.message : 'Failed to load data', 'error'),
    );
    refreshTotalCodes();
    refreshPendingCount();
  }, [loadCategoriesAndSites, refreshTotalCodes, refreshPendingCount, showToast]);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  const totalVouchers = vouchers.length;
  const allCategoryCount = useMemo(
    () => categories.reduce((sum, c) => sum + c.siteCount, 0),
    [categories],
  );

  const scrollToBrowse = useCallback(() => {
    browseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => searchRef.current?.focus(), 350);
  }, []);

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

  const handleRedeem = async (voucher: Voucher) => {
    // Optimistically bump the count, then reconcile with the server.
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

  const handleVoucherCreated = (voucher: Voucher, newSite?: Site) => {
    setShowAddVoucher(false);
    if (newSite) {
      setSites((prev) => [...prev, newSite]);
    }
    if (voucher.isApproved) {
      setVouchers((prev) => [voucher, ...prev]);
      setTotalCodes((n) => n + 1);
      showToast(`Voucher ${voucher.code} added for ${voucher.siteName}`);
    } else {
      if (view === 'review') setVouchers((prev) => [voucher, ...prev]);
      setPendingCount((n) => n + 1);
      showToast(`Thanks! ${voucher.code} is pending review and isn't visible yet.`);
    }
    loadCategoriesAndSites();
  };

  const handleApprove = async (voucher: Voucher) => {
    try {
      await api.approveVoucher(voucher.id);
      setVouchers((prev) => prev.filter((v) => v.id !== voucher.id));
      setPendingCount((n) => Math.max(0, n - 1));
      setTotalCodes((n) => n + 1);
      showToast(`Approved ${voucher.code} for ${voucher.siteName}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Approval failed', 'error');
    }
  };

  const handleReject = async (voucher: Voucher) => {
    if (!confirm(`Reject and delete ${voucher.code}?`)) return;
    try {
      await api.deleteVoucher(voucher.id);
      setVouchers((prev) => prev.filter((v) => v.id !== voucher.id));
      setPendingCount((n) => Math.max(0, n - 1));
      showToast(`Rejected ${voucher.code}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reject failed', 'error');
    }
  };

  const handleCategoryCreated = (category: Category) => {
    setShowAddCategory(false);
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
    showToast(`Category "${category.name}" added`);
  };

  return (
    <div className="app">
      <header className="app__header">
        <a className="app__brand" href="#top" aria-label={`${region.label} home`}>
          <Logo size={38} withWordmark />
        </a>
        <div className="app__header-actions">
          <a className="app__nav-link" href="#how-it-works">
            How it works
          </a>
          <RegionSwitcher region={region} />
          <button
            className={`btn ${view === 'review' ? 'btn--primary' : ''}`}
            onClick={() => setView(view === 'review' ? 'public' : 'review')}
            title="Review pending submissions"
          >
            {view === 'review' ? 'Back to codes' : 'Review'}
            {pendingCount > 0 && view !== 'review' && (
              <span className="btn__badge">{pendingCount}</span>
            )}
          </button>
          <button className="btn btn--primary" onClick={() => setShowAddVoucher(true)}>
            + Share a code
          </button>
        </div>
      </header>

      <span id="top" />

      {view === 'public' && (
        <>
          <Hero
            region={region}
            search={search}
            setSearch={setSearch}
            stats={{ codes: totalCodes, stores: allCategoryCount, categories: categories.length }}
            onBrowse={scrollToBrowse}
            onSubmit={() => setShowAddVoucher(true)}
          />
          <HowItWorks region={region} />
        </>
      )}

      <div className="app__body" ref={browseRef} id="browse">
        <aside className="sidebar">
          <div className="sidebar__header">
            <p className="sidebar__title">Categories</p>
            <button
              className="btn btn--ghost btn--small"
              onClick={() => setShowAddCategory(true)}
            >
              + Add
            </button>
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
          {view === 'review' ? (
            <>
              <div className="main__head">
                <h2 className="main__title">Review queue</h2>
                <p className="main__count">
                  {loading ? 'Loading…' : `${totalVouchers} pending`}
                </p>
              </div>
              <div className="banner banner--warn">
                <strong>Review queue:</strong> these codes were submitted by
                visitors and aren't visible to anyone until you approve them.
              </div>
            </>
          ) : (
            <>
              <div className="main__head">
                <h2 className="main__title">
                  {selectedCategory
                    ? `${categories.find((c) => c.id === selectedCategory)?.name ?? ''} ${region.term}`
                    : `Latest ${region.term}`}
                </h2>
                <p className="main__count">
                  {loading ? 'Loading…' : `${totalVouchers} ${totalVouchers === 1 ? 'code' : 'codes'}`}
                </p>
              </div>
              <div className="toolbar">
                <div className="search">
                  <input
                    ref={searchRef}
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
            </>
          )}

          {loading ? (
            <div className="loading">
              <span className="spinner" /> Loading {view === 'review' ? 'queue' : region.term}…
            </div>
          ) : totalVouchers === 0 ? (
            <div className="empty">
              <p className="empty__title">
                {view === 'review' ? 'Nothing to review' : `No ${region.term} found`}
              </p>
              <p>
                {view === 'review'
                  ? 'All caught up — new submissions will appear here.'
                  : 'Try clearing your filters, or be the first to add one.'}
              </p>
              {view === 'public' && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn--primary" onClick={() => setShowAddVoucher(true)}>
                    Share a code
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="voucher-list">
              {vouchers.map((v) => (
                <VoucherCard
                  key={v.id}
                  voucher={v}
                  mode={view === 'review' ? 'review' : 'public'}
                  onVote={(d) => handleVote(v, d)}
                  onRedeem={() => handleRedeem(v)}
                  onApprove={() => handleApprove(v)}
                  onReject={() => handleReject(v)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {view === 'public' && (
        <Footer
          region={region}
          categories={categories}
          onPickCategory={(id) => {
            setSelectedCategory(id);
            scrollToBrowse();
          }}
          onSubmit={() => setShowAddVoucher(true)}
        />
      )}

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
