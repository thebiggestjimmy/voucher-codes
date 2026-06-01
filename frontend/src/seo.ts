import { useEffect } from 'react';
import type { RegionConfig } from './region';
import { SITE } from './config';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Aligns the document head with the active region at runtime. The static tags
 * in index.html cover the first-paint / no-JS crawl; this keeps title,
 * description, canonical and og:locale correct once the SPA knows which domain
 * (and therefore region) it is actually running on.
 */
export function useRegionalSeo(region: RegionConfig) {
  useEffect(() => {
    document.documentElement.lang = region.locale;
    document.title = region.metaTitle;

    setMeta('meta[name="description"]', 'name', 'description', region.metaDescription);
    setMeta('meta[name="keywords"]', 'name', 'keywords', region.metaKeywords);

    setMeta('meta[property="og:title"]', 'property', 'og:title', region.metaTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', region.metaDescription);
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE.name);
    setMeta('meta[property="og:locale"]', 'property', 'og:locale', region.ogLocale);

    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', region.metaTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', region.metaDescription);

    // Self-referential canonical + og:url based on the real origin we're on.
    const canonical = window.location.origin + window.location.pathname;
    setLink('canonical', canonical);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
  }, [region]);
}
