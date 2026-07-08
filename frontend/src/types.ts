export interface Category {
  id: number;
  name: string;
  slug: string;
  color: string;
  description: string;
  siteCount: number;
  /** Live codes: approved and not expired. What the sidebar badges show. */
  voucherCount: number;
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
  /** Empty string for link-only deals. */
  code: string;
  /** Deal link with the discount embedded; empty when the offer is code-only. */
  linkUrl: string;
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
