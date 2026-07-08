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
  categories: Category[];
  onClose: () => void;
  onChanged: (categories: Category[]) => void;
  onError: (message: string) => void;
}

interface EditState {
  id: number;
  name: string;
  color: string;
}

export function ManageCategoriesModal({ categories, onClose, onChanged, onError }: Props) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const startEdit = (c: Category) => setEditing({ id: c.id, name: c.name, color: c.color });
  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    setBusyId(editing.id);
    try {
      const updated = await api.updateCategory(editing.id, {
        name: editing.name.trim(),
        color: editing.color,
      });
      onChanged(
        categories
          .map((c) => (c.id === updated.id ? updated : c))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditing(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    setBusyId(c.id);
    try {
      await api.deleteCategory(c.id);
      onChanged(categories.filter((x) => x.id !== c.id));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Manage categories</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal__body">
          {categories.length === 0 && (
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No categories yet.</p>
          )}
          <ul className="manage-list">
            {categories.map((c) => {
              const isEditing = editing?.id === c.id;
              return (
                <li key={c.id} className="manage-list__item">
                  {isEditing ? (
                    <div className="manage-list__editor">
                      <input
                        value={editing!.name}
                        onChange={(e) =>
                          setEditing({ ...editing!, name: e.target.value })
                        }
                        placeholder="Category name"
                      />
                      <div className="color-swatches">
                        {PALETTE.map((clr) => (
                          <button
                            type="button"
                            key={clr}
                            className={`color-swatch ${clr === editing!.color ? 'color-swatch--active' : ''}`}
                            style={{ background: clr }}
                            onClick={() => setEditing({ ...editing!, color: clr })}
                            aria-label={`Pick ${clr}`}
                          />
                        ))}
                      </div>
                      <div className="manage-list__actions">
                        <button
                          type="button"
                          className="btn btn--small"
                          onClick={cancelEdit}
                          disabled={busyId === c.id}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn--primary btn--small"
                          onClick={saveEdit}
                          disabled={busyId === c.id || !editing!.name.trim()}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="manage-list__label">
                        <span
                          className="sidebar__dot"
                          style={{ background: c.color }}
                        />
                        {c.name}
                        <span className="sidebar__count">
                          {c.siteCount} {c.siteCount === 1 ? 'store' : 'stores'}
                        </span>
                      </span>
                      <div className="manage-list__actions">
                        <button
                          type="button"
                          className="btn btn--small"
                          onClick={() => startEdit(c)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger btn--small"
                          onClick={() => doDelete(c)}
                          disabled={busyId === c.id}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="hint">
            A category can only be deleted once it has no stores. To remove or
            move a store, open its page and use Delete store / Edit store.
          </p>
        </div>
      </div>
    </div>
  );
}
