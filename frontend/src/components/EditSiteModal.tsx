import { useState } from 'react';
import { api } from '../api';
import type { Category, Site } from '../types';

interface Props {
  site: Site;
  categories: Category[];
  onClose: () => void;
  onSaved: (site: Site) => void;
}

export function EditSiteModal({ site, categories, onClose, onSaved }: Props) {
  const [name, setName] = useState(site.name);
  const [url, setUrl] = useState(site.url);
  const [categoryId, setCategoryId] = useState<number>(site.categoryId);
  const [description, setDescription] = useState(site.description);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !url.trim()) {
      setError('Name and URL are required.');
      return;
    }
    setBusy(true);
    try {
      const updated = await api.updateSite(site.id, {
        name: name.trim(),
        url: url.trim(),
        categoryId,
        description: description.trim(),
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal__header">
          <h2 className="modal__title">Edit store</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal__body">
          {error && <div className="error-msg">{error}</div>}

          <div className="field">
            <label htmlFor="site-name">Store name</label>
            <input
              id="site-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="site-url">Website URL</label>
            <input
              id="site-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="site-cat">Category</label>
            <select
              id="site-cat"
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="hint">
              Moving the store also moves all of its codes to the new category.
            </p>
          </div>

          <div className="field">
            <label htmlFor="site-desc">Description</label>
            <textarea
              id="site-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Editorial description shown on the store page (helps SEO)."
            />
          </div>
        </div>

        <div className="modal__footer">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
