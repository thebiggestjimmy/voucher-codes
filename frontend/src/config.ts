// Central brand + domain configuration.
//
// IMPORTANT: if your real domains differ from the assumed pair below, change
// them here in ONE place — every canonical URL, hreflang tag, sitemap entry
// and social link is derived from this object.
export const SITE = {
  name: 'SirSavings',
  // Short tagline used in headers / meta where space is tight.
  tagline: 'Smart savings, sorted.',
  domains: {
    uk: 'sirsavings.co.uk', // regional: en-GB
    global: 'sirsavings.com', // default / x-default: en-US + rest of world
  },
  // Social handle used for Twitter/X cards (no leading @ needed elsewhere).
  twitter: 'sirsavings',
  // Support / contact shown in the footer.
  email: 'hello@sirsavings.com',
} as const;

export const httpsUrl = (domain: string, path = '/') => `https://${domain}${path}`;
