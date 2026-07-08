import { useState } from 'react';
import { api } from '../api';
import type { Site, Voucher } from '../types';

interface Props {
  voucher: Voucher;
  sites: Site[];
  onClose: () => void;
  onSaved: (voucher: Voucher) => void;
}

// The voucher's expiresOn is an ISO string; the <input type="date"> wants YYYY-MM-DD.
function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function EditVoucherModal({ voucher, sites, onClose, onSaved }: Props) {
  const [code, setCode] = useState(voucher.code);
  const [linkUrl, setLinkUrl] = useState(voucher.linkUrl);
  const [description, setDescription] = useState(voucher.description);
  const [siteId, setSiteId] = useState<number>(voucher.siteId);
  const [expiresOn, setExpiresOn] = useState(toDateInputValue(voucher.expiresOn));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim() && !linkUrl.trim()) {
      setError('Provide a voucher code, a deal link, or both.');
      return;
    }
    setBusy(true);
    try {
      const updated = await api.updateVoucher(voucher.id, {
        code: code.trim(),
        linkUrl: linkUrl.trim(),
        description: description.trim(),
        siteId,
        expiresOn: expiresOn ? new Date(expiresOn).toISOString() : null,
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
          <h2 className="modal__title">Edit voucher</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal__body">
          {error && <div className="error-msg">{error}</div>}

          <div className="field">
            <label htmlFor="edit-site">Site</label>
            <select
              id="edit-site"
              value={siteId}
              onChange={(e) => setSiteId(Number(e.target.value))}
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.categoryName})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="edit-code">Voucher code</label>
            <input
              id="edit-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Leave blank for a link-only deal"
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="edit-link">Deal link (optional)</label>
            <input
              id="edit-link"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://store.com/offer?ref=…"
            />
            <p className="hint">
              A link that applies the discount automatically — shoppers see a
              "Get deal" button. Either a code or a link is required.
            </p>
          </div>

          <div className="field">
            <label htmlFor="edit-desc">Description</label>
            <textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this code do? e.g. 20% off summer collection."
            />
          </div>

          <div className="field">
            <label htmlFor="edit-expires">Expires on (optional)</label>
            <input
              id="edit-expires"
              type="date"
              value={expiresOn}
              onChange={(e) => setExpiresOn(e.target.value)}
            />
            {expiresOn && (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => setExpiresOn('')}
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
              >
                Clear expiry
              </button>
            )}
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
