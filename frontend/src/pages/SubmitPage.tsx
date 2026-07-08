import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../api';
import { useLayout } from '../Layout';
import { Sidebar } from '../components/Sidebar';
import { httpsUrl, SITE } from '../config';
import type { Voucher } from '../types';

export function SubmitPage() {
  const navigate = useNavigate();
  const { isAdmin, region, categories, sites, onVoucherCreated, showToast } = useLayout();

  const [mode, setMode] = useState<'existing' | 'new'>(sites.length ? 'existing' : 'new');
  const [siteId, setSiteId] = useState<number | ''>(sites[0]?.id ?? '');
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [newSiteDescription, setNewSiteDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>(categories[0]?.id ?? '');
  const [code, setCode] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [description, setDescription] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (siteId === '' && sites.length > 0) setSiteId(sites[0].id);
    if (categoryId === '' && categories.length > 0) setCategoryId(categories[0].id);
  }, [sites, categories, siteId, categoryId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim() && !linkUrl.trim()) {
      setError('Provide a voucher code, a deal link, or both.');
      return;
    }
    setBusy(true);
    try {
      let targetSite = sites.find((s) => s.id === siteId);
      let createdSite;
      if (mode === 'new') {
        if (!newSiteName.trim() || !newSiteUrl.trim() || !categoryId) {
          throw new Error('Site name, URL and category are all required.');
        }
        createdSite = await api.createSite({
          name: newSiteName.trim(),
          url: newSiteUrl.trim(),
          categoryId: Number(categoryId),
          description: newSiteDescription.trim(),
        });
        targetSite = createdSite;
      }
      if (!targetSite) throw new Error('Please choose a site.');

      const voucher: Voucher = await api.createVoucher({
        code: code.trim(),
        linkUrl: linkUrl.trim(),
        description: description.trim(),
        siteId: targetSite.id,
        submittedBy: submittedBy.trim() || 'anonymous',
        expiresOn: expiresOn ? new Date(expiresOn).toISOString() : null,
      });
      onVoucherCreated(voucher, createdSite);
      navigate(voucher.isApproved ? `/site/${voucher.siteSlug}` : '/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit voucher.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const totalCategoryCount = categories.reduce((sum, c) => sum + c.siteCount, 0);
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : httpsUrl(region.domain);

  return (
    <>
      <Helmet>
        <title>Submit a voucher code | {SITE.name}</title>
        <meta
          name="description"
          content={`Help other shoppers save — submit a working ${region.term.slice(0, -1)} for your favourite ${region.audience}. Submissions are reviewed before appearing.`}
        />
        <link rel="canonical" href={`${siteUrl}/submit`} />
      </Helmet>

      <div className="app__body">
        <Sidebar categories={categories} totalCategoryCount={totalCategoryCount} />
        <main className="main">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">›</span>
            <span>Submit</span>
          </nav>

          <section className="page-hero">
            <h1>{isAdmin ? 'Add a voucher code' : 'Share a voucher code'}</h1>
            <p>
              Help other shoppers save money by sharing a working code. Pick an
              existing store or add a new one — assign it to the right category
              so it's easy to find.
            </p>
          </section>

          <form className="submit-form" onSubmit={submit}>
            {error && <div className="error-msg">{error}</div>}
            {isAdmin ? (
              <div className="banner">
                You're signed in as admin — this code will be published immediately.
              </div>
            ) : (
              <div className="banner banner--warn">
                Submissions are held for review and stay hidden until an admin
                approves them.
              </div>
            )}

            <div className="field">
              <label>Site</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={`btn btn--small ${mode === 'existing' ? 'btn--primary' : ''}`}
                  onClick={() => setMode('existing')}
                  disabled={!sites.length}
                >
                  Pick existing
                </button>
                <button
                  type="button"
                  className={`btn btn--small ${mode === 'new' ? 'btn--primary' : ''}`}
                  onClick={() => setMode('new')}
                >
                  Add new site
                </button>
              </div>
            </div>

            {mode === 'existing' ? (
              <div className="field">
                <label htmlFor="siteSelect">Choose a site</label>
                <select
                  id="siteSelect"
                  value={siteId}
                  onChange={(e) =>
                    setSiteId(e.target.value ? Number(e.target.value) : '')
                  }
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.categoryName})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="newSiteName">Site name</label>
                  <input
                    id="newSiteName"
                    value={newSiteName}
                    onChange={(e) => setNewSiteName(e.target.value)}
                    placeholder="e.g. Etsy"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="newSiteUrl">Website URL</label>
                  <input
                    id="newSiteUrl"
                    value={newSiteUrl}
                    onChange={(e) => setNewSiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    type="url"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="newSiteCat">Category</label>
                  <select
                    id="newSiteCat"
                    value={categoryId}
                    onChange={(e) =>
                      setCategoryId(e.target.value ? Number(e.target.value) : '')
                    }
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="newSiteDesc">One-line description</label>
                  <input
                    id="newSiteDesc"
                    value={newSiteDescription}
                    onChange={(e) => setNewSiteDescription(e.target.value)}
                    placeholder="What does this store sell?"
                  />
                </div>
              </>
            )}

            <div className="field">
              <label htmlFor="code">Voucher code</label>
              <input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SUMMER20"
              />
              <p className="hint">
                Leave blank if the discount is applied through a link instead of a code.
              </p>
            </div>

            <div className="field">
              <label htmlFor="linkUrl">Deal link (optional)</label>
              <input
                id="linkUrl"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://store.com/offer?ref=…"
              />
              <p className="hint">
                For "no code needed" promotions: a link that applies the
                discount automatically. Shoppers will see a "Get deal" button.
              </p>
            </div>

            <div className="field">
              <label htmlFor="desc">Description</label>
              <textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this code do? e.g. 20% off summer collection."
              />
            </div>

            <div className="field--row" style={{ display: 'flex', gap: 10 }}>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="expires">Expires on (optional)</label>
                <input
                  id="expires"
                  type="date"
                  value={expiresOn}
                  onChange={(e) => setExpiresOn(e.target.value)}
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="submittedBy">Your name (optional)</label>
                <input
                  id="submittedBy"
                  value={submittedBy}
                  onChange={(e) => setSubmittedBy(e.target.value)}
                  placeholder="anonymous"
                />
              </div>
            </div>

            <div className="submit-form__footer">
              <Link className="btn" to="/">Cancel</Link>
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? 'Submitting…' : isAdmin ? 'Publish voucher' : 'Submit voucher'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </>
  );
}
