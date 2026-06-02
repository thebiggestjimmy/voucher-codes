export interface Category {
  id: number;
  name: string;
  color: string;
  siteCount: number;
}

export interface Site {
  id: number;
  name: string;
  url: string;
  categoryId: number;
  categoryName: string;
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
  siteId: number;
  siteName: string;
  siteUrl: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
}

export type SortKey = 'top' | 'new' | 'expiring' | 'popular';
