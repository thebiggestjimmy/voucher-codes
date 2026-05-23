import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Category, Site, Voucher } from '../types';

interface Props {
  categories: Category[];
  sites: Site[];
  defaultSiteId?: number;
  defaultCategoryId?: number;
  onClose: () => void;
  onCreated: (voucher: Voucher, newSite?: Site) => void;
}

export function AddVoucherModal({
  categories,
  sites,
  defaultSiteId,
  defaultCategoryId,
  onClose,
  onCreated,
}: Props) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [siteId, setSiteId] = useState<number | ''>(defaultSiteId ?? sites[0]?.id ?? '');
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>(
    defaultCategoryId ?? categories[0]?.id ?? '',
  );
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sites.length) setMode('new');
  }, [sites.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError('Voucher code is required.');
      return;
    }
    setBusy(true);
    try {
      let targetSite: Site | undefined = sites.find((s) => s.id === siteId);
      let createdSite: Site | undefined;

      if (mode === 'new') {
        if (!newSiteName.trim() || !newSiteUrl.trim() || !categoryId) {
          throw new Error('Site name, URL and category are all required.');
        }
        createdSite = await api.createSite({
          name: newSiteName.trim(),
          url: newSiteUrl.trim(),
          categoryId: Number(categoryId),
        });
        targetSite = createdSite;
      }

      if (!targetSite) throw new Error('Please choose a site.');

      const voucher = await api.createVoucher({
        code: code.trim(),
        description: description.trim(),
        siteId: targetSite.id,
        submittedBy: submittedBy.trim() || 'anonymous',
        expiresOn: expiresOn ? new Date(expiresOn).toISOString() : null,
      });

      onCreated(voucher, createdSite);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create voucher.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal__header">
          <h2 className="modal__title">Submit a voucher code</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal__body">
          {error && <div className="error-msg">{error}</div>}

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
                onChange={(e) => setSiteId(e.target.value ? Number(e.target.value) : '')}
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
            </>
          )}

          <div className="field">
            <label htmlFor="code">Voucher code</label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="SUMMER20"
              required
            />
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
        </div>

        <div className="modal__footer">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit voucher'}
          </button>
        </div>
      </form>
    </div>
  );
}
