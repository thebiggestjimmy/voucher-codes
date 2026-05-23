import { useState } from 'react';
import { api } from '../api';
import type { Category } from '../types';

const PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#10b981', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#64748b',
];

interface Props {
  onClose: () => void;
  onCreated: (category: Category) => void;
}

export function AddCategoryModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[7]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setBusy(true);
    try {
      const created = await api.createCategory({ name: name.trim(), color });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal__header">
          <h2 className="modal__title">Add a category</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal__body">
          {error && <div className="error-msg">{error}</div>}
          <div className="field">
            <label htmlFor="catName">Category name</label>
            <input
              id="catName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Beauty"
              autoFocus
            />
          </div>
          <div className="field">
            <label>Colour</label>
            <div className="color-swatches">
              {PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`color-swatch ${c === color ? 'color-swatch--active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Pick ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create category'}
          </button>
        </div>
      </form>
    </div>
  );
}
