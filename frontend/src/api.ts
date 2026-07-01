import type { Category, Site, SortKey, Voucher, VoucherStatus } from './types';

const base = '/api';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  listCategories: () => request<Category[]>(`${base}/categories`),
  createCategory: (input: { name: string; color: string }) =>
    request<Category>(`${base}/categories`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  listSites: (params?: { categoryId?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.categoryId) query.set('categoryId', String(params.categoryId));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<Site[]>(`${base}/sites${qs ? `?${qs}` : ''}`);
  },
  createSite: (input: { name: string; url: string; categoryId: number }) =>
    request<Site>(`${base}/sites`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  listVouchers: (params?: {
    siteId?: number;
    categoryId?: number;
    search?: string;
    includeExpired?: boolean;
    sort?: SortKey;
    status?: VoucherStatus;
  }) => {
    const query = new URLSearchParams();
    if (params?.siteId) query.set('siteId', String(params.siteId));
    if (params?.categoryId) query.set('categoryId', String(params.categoryId));
    if (params?.search) query.set('search', params.search);
    if (params?.includeExpired) query.set('includeExpired', 'true');
    if (params?.sort) query.set('sort', params.sort);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return request<Voucher[]>(`${base}/vouchers${qs ? `?${qs}` : ''}`);
  },
  pendingCount: () =>
    request<{ count: number }>(`${base}/vouchers/pending-count`),
  createVoucher: (input: {
    code: string;
    description: string;
    siteId: number;
    submittedBy: string;
    expiresOn: string | null;
  }) =>
    request<Voucher>(`${base}/vouchers`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  voteVoucher: (id: number, direction: 'up' | 'down') =>
    request<Voucher>(`${base}/vouchers/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    }),
  redeemVoucher: (id: number) =>
    request<Voucher>(`${base}/vouchers/${id}/redeem`, { method: 'POST' }),
  approveVoucher: (id: number) =>
    request<Voucher>(`${base}/vouchers/${id}/approve`, { method: 'POST' }),
  deleteVoucher: (id: number) =>
    request<void>(`${base}/vouchers/${id}`, { method: 'DELETE' }),
};
