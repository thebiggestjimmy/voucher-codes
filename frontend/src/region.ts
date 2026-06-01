import { SITE, httpsUrl } from './config';

export type RegionId = 'uk' | 'global';

export interface RegionConfig {
  id: RegionId;
  /** BCP-47 locale used for date/number formatting + <html lang>. */
  locale: string;
  /** Open Graph locale token. */
  ogLocale: string;
  /** Currency symbol used in marketing copy and stat tiles. */
  currency: string;
  /** Bare hostname this region is served from. */
  domain: string;
  /** Short human label for the region switcher. */
  label: string;
  flag: string;
  /** Country word woven into copy ("UK stores" / "your favorite stores"). */
  audience: string;
  /** Lower-case noun used throughout the UI ("voucher codes" / "promo codes"). */
  term: string;
  /** Title-case variant for headings. */
  termTitle: string;
  /** SEO <title>. */
  metaTitle: string;
  /** SEO meta description. */
  metaDescription: string;
  /** SEO keywords (still used by some engines + internal hints). */
  metaKeywords: string;
}

const UK: RegionConfig = {
  id: 'uk',
  locale: 'en-GB',
  ogLocale: 'en_GB',
  currency: '£',
  domain: SITE.domains.uk,
  label: 'United Kingdom',
  flag: '🇬🇧',
  audience: 'top UK stores',
  term: 'voucher codes',
  termTitle: 'Voucher Codes',
  metaTitle: `${SITE.name} — Free Voucher Codes & Discount Codes, Verified Daily`,
  metaDescription:
    `Find thousands of verified voucher codes and discount codes for top UK stores. ` +
    `Save on fashion, tech, food, travel and more — free to use, community-checked and updated daily.`,
  metaKeywords:
    'voucher codes, discount codes, promo codes, free voucher codes, UK discount codes, ' +
    'money off codes, deals, coupons, savings',
};

const GLOBAL: RegionConfig = {
  id: 'global',
  locale: 'en-US',
  ogLocale: 'en_US',
  currency: '$',
  domain: SITE.domains.global,
  label: 'International',
  flag: '🌍',
  audience: 'your favorite stores',
  term: 'promo codes',
  termTitle: 'Promo Codes',
  metaTitle: `${SITE.name} — Free Promo Codes & Coupon Codes, Verified Daily`,
  metaDescription:
    `Find thousands of verified promo codes and coupon codes for your favorite stores. ` +
    `Save on fashion, tech, food, travel and more — free to use, community-checked and updated daily.`,
  metaKeywords:
    'promo codes, coupon codes, discount codes, free promo codes, coupons, ' +
    'money off codes, deals, savings',
};

export const REGIONS: Record<RegionId, RegionConfig> = { uk: UK, global: GLOBAL };

/**
 * Picks the active region from the hostname so the .co.uk and .com domains
 * serve regionally-appropriate copy from the same build. A `?region=uk|us`
 * query param overrides it (handy for previewing and for local dev).
 */
export function detectRegion(): RegionConfig {
  if (typeof window === 'undefined') return GLOBAL;

  const override = new URLSearchParams(window.location.search).get('region');
  if (override === 'uk') return UK;
  if (override === 'us' || override === 'global') return GLOBAL;

  const host = window.location.hostname.toLowerCase();
  if (host.endsWith('.co.uk')) return UK;
  // Local dev mirrors the £-denominated seed data, so default it to the UK.
  if (host === 'localhost' || host.startsWith('127.') || host === '[::1]') return UK;
  return GLOBAL;
}

/** The region this one points visitors to via the language/region switcher. */
export const otherRegion = (region: RegionConfig): RegionConfig =>
  region.id === 'uk' ? GLOBAL : UK;

export const regionUrl = (region: RegionConfig, path = '/') => httpsUrl(region.domain, path);
