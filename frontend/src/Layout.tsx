import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './App.css';
import { admin } from './admin';
import { api, UnauthorizedError } from './api';
import { AddCategoryModal } from './components/AddCategoryModal';
import { LoginModal } from './components/LoginModal';
import { ManageCategoriesModal } from './components/ManageCategoriesModal';
import { Logo } from './components/Logo';
import { RegionSwitcher } from './components/RegionSwitcher';
import { Footer } from './components/Footer';
import { detectRegion } from './region';
import { useRegionalSeo } from './seo';
import type { Category, Site, Voucher } from './types';

type Toast = { message: string; tone: 'info' | 'error' } | null;

export interface LayoutContext {
  isAdmin: boolean;
  region: ReturnType<typeof detectRegion>;
  categories: Category[];
  sites: Site[];
  pendingCount: number;
  showToast: (message: string, tone?: 'info' | 'error') => void;
  onVoucherCreated: (voucher: Voucher, newSite?: Site) => void;
  refreshCategoriesAndSites: () => Promise<void>;
  bumpPendingCount: (delta: number) => void;
  scrollToBrowse: () => void;
  browseRef: React.RefObject<HTMLDivElement | null>;
  searchRef: React.RefObject<HTMLInputElement | null>;
}

export function useLayout(): LayoutContext {
  return useOutletContext<LayoutContext>();
}

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [region] = useState(detectRegion);
  useRegionalSeo(region);

  const [isAdmin, setIsAdmin] = useState<boolean>(!!admin.getToken());
  const [showLogin, setShowLogin] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [toast, setToast] = useState<Toast>(null);

  const browseRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string, tone: 'info' | 'error' = 'info') => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 2800);
  }, []);

  const refreshCategoriesAndSites = useCallback(async () => {
    const [cats, allSites] = await Promise.all([api.listCategories(), api.listSites()]);
    setCategories(cats);
    setSites(allSites);
  }, []);

  const refreshPendingCount = useCallback(async () => {
    if (!admin.getToken()) {
      setPendingCount(0);
      return;
    }
    try {
      const { count } = await api.pendingCount();
      setPendingCount(count);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const unsub = admin.subscribe((token) => setIsAdmin(!!token));
    return unsub;
  }, []);

  useEffect(() => {
    (async () => {
      if (!admin.getToken()) return;
      try {
        await api.adminMe();
        setIsAdmin(true);
      } catch (err) {
        if (err instanceof UnauthorizedError) setIsAdmin(false);
      }
    })();
  }, []);

  useEffect(() => {
    refreshCategoriesAndSites().catch((err) =>
      showToast(err instanceof Error ? err.message : 'Failed to load data', 'error'),
    );
  }, [refreshCategoriesAndSites, showToast]);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount, isAdmin]);

  const scrollToBrowse = useCallback(() => {
    browseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => searchRef.current?.focus(), 350);
  }, []);

  const onVoucherCreated = (voucher: Voucher, newSite?: Site) => {
    if (newSite) setSites((prev) => [...prev, newSite]);
    if (!voucher.isApproved) setPendingCount((n) => n + 1);
    refreshCategoriesAndSites();
    showToast(
      voucher.isApproved
        ? `Added ${voucher.code} for ${voucher.siteName}`
        : `Thanks! ${voucher.code} is pending review and isn't visible yet.`,
    );
  };

  const bumpPendingCount = (delta: number) =>
    setPendingCount((n) => Math.max(0, n + delta));

  const handleSignOut = async () => {
    try {
      await api.adminLogout();
    } catch {
      // ignore
    }
    admin.clearToken();
    setShowManageCategories(false);
    showToast('Signed out');
    navigate('/');
  };

  const handleSignedIn = async () => {
    setShowLogin(false);
    setIsAdmin(true);
    refreshPendingCount();
    showToast('Signed in as admin');
  };

  const handleCategoryCreated = (category: Category) => {
    setShowAddCategory(false);
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
    showToast(`Category "${category.name}" added`);
  };

  const ctx: LayoutContext = {
    isAdmin,
    region,
    categories,
    sites,
    pendingCount,
    showToast,
    onVoucherCreated,
    refreshCategoriesAndSites,
    bumpPendingCount,
    scrollToBrowse,
    browseRef,
    searchRef,
  };

  const isHome = location.pathname === '/';

  return (
    <div className="app">
      <Helmet>
        <html lang={region.locale} />
        <meta name="theme-color" content="#312e81" />
      </Helmet>
      <header className="app__header">
        <Link className="app__brand" to="/" aria-label={`${region.label} home`}>
          <Logo size={38} withWordmark />
        </Link>
        <div className="app__header-actions">
          {isHome && (
            <a className="app__nav-link" href="#how-it-works">
              How it works
            </a>
          )}
          <RegionSwitcher region={region} />
          {isAdmin && (
            <>
              <NavLink
                to="/review"
                className={({ isActive }) => `btn ${isActive ? 'btn--primary' : ''}`}
                title="Review pending submissions"
              >
                Review
                {pendingCount > 0 && (
                  <span className="btn__badge">{pendingCount}</span>
                )}
              </NavLink>
              <button className="btn" onClick={() => setShowManageCategories(true)}>
                Manage
              </button>
              <button className="btn" onClick={() => setShowAddCategory(true)}>
                + Category
              </button>
            </>
          )}
          <Link className="btn btn--primary" to="/submit">
            + {isAdmin ? 'Add code' : 'Share a code'}
          </Link>
          {isAdmin ? (
            <>
              <span className="app__admin-chip">Admin</span>
              <button className="btn btn--ghost" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <button className="btn btn--ghost" onClick={() => setShowLogin(true)}>
              Admin sign in
            </button>
          )}
        </div>
      </header>

      <Outlet context={ctx} />

      <Footer
        region={region}
        categories={categories}
        onPickCategory={(id) => {
          const cat = categories.find((c) => c.id === id);
          if (cat) navigate(`/category/${cat.slug}`);
        }}
        onSubmit={() => navigate('/submit')}
      />

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onSignedIn={handleSignedIn} />
      )}
      {showManageCategories && (
        <ManageCategoriesModal
          categories={categories}
          onClose={() => setShowManageCategories(false)}
          onChanged={(next) => setCategories(next)}
          onError={(msg) => showToast(msg, 'error')}
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
