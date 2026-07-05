export interface Category {
  id: number;
  name: string;
  slug: string;
  color: string;
  description: string;
  siteCount: number;
}

export interface Site {
  id: number;
  name: string;
  slug: string;
  url: string;
  description: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  categoryColor: string;
  voucherCount: number;
}

export interface Voucher {
  id: number;
  code: string;
  description: string;
  expiresOn: string | null;
  submittedOn: string;
  submittedBy: string;
  upvotes: number;
  downvotes: number;
  redeemCount: number;
  isApproved: boolean;
  siteId: number;
  siteName: string;
  siteSlug: string;
  siteUrl: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  categoryColor: string;
}

export type SortKey = 'top' | 'new' | 'expiring' | 'popular';

export type VoucherStatus = 'approved' | 'pending' | 'all';
