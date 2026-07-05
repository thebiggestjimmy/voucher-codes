import { useState } from 'react';
import { api } from '../api';
import { admin } from '../admin';

interface Props {
  onClose: () => void;
  onSignedIn: () => void;
}

export function LoginModal({ onClose, onSignedIn }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { token } = await api.adminLogin(password);
      admin.setToken(token);
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal__header">
          <h2 className="modal__title">Admin sign in</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal__body">
          {error && <div className="error-msg">{error}</div>}
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
            Sign in to review submissions, add new codes and manage categories.
          </p>
          <div className="field">
            <label htmlFor="admin-pw">Password</label>
            <input
              id="admin-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
            />
          </div>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
