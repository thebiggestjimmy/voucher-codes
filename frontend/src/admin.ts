const TOKEN_KEY = 'sirsavings-admin-token';

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

export const admin = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    listeners.forEach((l) => l(token));
  },
  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    listeners.forEach((l) => l(null));
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
