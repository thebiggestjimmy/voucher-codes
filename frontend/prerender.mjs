#!/usr/bin/env node
/**
 * Prerender the SPA to static HTML for SEO.
 *
 * Usage:
 *   API_BASE=http://localhost:5080 \
 *   FRONTEND_BASE=http://localhost:4173 \
 *   PUBLIC_BASE=https://sirsavings.com \
 *   node prerender.mjs
 *
 * Boots headless Chromium, visits each route, waits for content, and writes
 * `dist/<route>/index.html` so any static host serves real HTML with per-page
 * <title>, <meta>, and JSON-LD in the initial response.
 *
 * Also emits dist/sitemap.xml + dist/robots.txt so the sitemap is always in
 * sync with the routes actually available.
 */

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, 'dist');

const API_BASE = process.env.API_BASE || 'http://localhost:5080';
const FRONTEND_BASE = process.env.FRONTEND_BASE || 'http://localhost:4173';
const PUBLIC_BASE = (process.env.PUBLIC_BASE || FRONTEND_BASE).replace(/\/$/, '');
const CHROMIUM = process.env.CHROMIUM || undefined;

async function discoverRoutes() {
  const [categories, sites] = await Promise.all([
    fetch(`${API_BASE}/api/categories`).then((r) => r.json()),
    fetch(`${API_BASE}/api/sites`).then((r) => r.json()),
  ]);

  const routes = ['/', '/submit'];
  for (const c of categories) routes.push(`/category/${c.slug}`);
  for (const s of sites) routes.push(`/site/${s.slug}`);
  return { routes, categories, sites };
}

async function renderRoute(page, route) {
  const target = `${FRONTEND_BASE}${route}`;
  console.log(`  → ${route}`);
  await page.goto(target, { waitUntil: 'load', timeout: 30000 });
  // Wait until React has rendered and all data fetches have settled.
  await page.waitForFunction(
    () => {
      const main = document.querySelector('main.main');
      if (!main) return false;
      const hasContent = main.querySelector(
        '.page-hero, .page-intro__lead, .submit-form, .main__head',
      );
      if (!hasContent) return false;
      const stillLoading = main.querySelector('.loading, .spinner');
      if (stillLoading) return false;
      return !!main.querySelector('.voucher-list, .empty, .submit-form');
    },
    { timeout: 20000 },
  );
  // Give react-helmet-async a tick to flush.
  await page.waitForTimeout(200);

  // react-helmet-async duplicates head tags on client-side prerender. Use the
  // runtime values (which the SPA actually resolves to) to rebuild a clean head.
  await page.evaluate(() => {
    const head = document.head;

    // Titles: keep only the live document.title.
    const winningTitle = document.title;
    for (const t of head.querySelectorAll('title')) t.remove();
    const t = document.createElement('title');
    t.textContent = winningTitle;
    head.appendChild(t);

    // Meta tags: keep the last of each unique key.
    const metaGroups = new Map();
    for (const m of head.querySelectorAll('meta')) {
      const key =
        m.getAttribute('name') ||
        m.getAttribute('property') ||
        m.getAttribute('http-equiv');
      if (!key) continue;
      if (!metaGroups.has(key)) metaGroups.set(key, []);
      metaGroups.get(key).push(m);
    }
    for (const list of metaGroups.values()) {
      for (let i = 0; i < list.length - 1; i++) list[i].remove();
    }

    // Link tags with unique rel values (canonical / icon): keep last.
    const linkGroups = new Map();
    for (const l of head.querySelectorAll('link')) {
      const rel = l.getAttribute('rel');
      if (rel !== 'canonical' && rel !== 'icon') continue;
      if (!linkGroups.has(rel)) linkGroups.set(rel, []);
      linkGroups.get(rel).push(l);
    }
    for (const list of linkGroups.values()) {
      for (let i = 0; i < list.length - 1; i++) list[i].remove();
    }

    // JSON-LD: dedupe by content.
    const seenLd = new Set();
    for (const s of head.querySelectorAll('script[type="application/ld+json"]')) {
      const hash = s.textContent.trim();
      if (seenLd.has(hash)) s.remove();
      else seenLd.add(hash);
    }
  });

  let html = await page.content();
  // Rewrite localhost URLs so canonical / og:url match the production origin.
  if (PUBLIC_BASE !== FRONTEND_BASE) {
    html = html.split(FRONTEND_BASE).join(PUBLIC_BASE);
  }
  return html;
}

async function writeHtml(route, html) {
  const outputPath =
    route === '/'
      ? join(distDir, 'index.html')
      : join(distDir, route.replace(/^\//, ''), 'index.html');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, 'utf8');
}

async function writeSitemapAndRobots(categories, sites) {
  const urls = [
    { loc: `${PUBLIC_BASE}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${PUBLIC_BASE}/submit`, changefreq: 'monthly', priority: '0.5' },
  ];
  for (const c of categories)
    urls.push({ loc: `${PUBLIC_BASE}/category/${c.slug}`, changefreq: 'weekly', priority: '0.8' });
  for (const s of sites)
    urls.push({ loc: `${PUBLIC_BASE}/site/${s.slug}`, changefreq: 'weekly', priority: '0.9' });

  const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
      )
      .join('\n') +
    '\n</urlset>\n';

  await writeFile(join(distDir, 'sitemap.xml'), sitemap, 'utf8');

  const robots = `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${PUBLIC_BASE}/sitemap.xml\n`;
  await writeFile(join(distDir, 'robots.txt'), robots, 'utf8');
}

async function main() {
  try {
    await readFile(join(distDir, 'index.html'), 'utf8');
  } catch {
    console.error(
      'dist/index.html not found. Run `vite build` before `node prerender.mjs`.',
    );
    process.exit(1);
  }

  console.log(`Prerendering from ${FRONTEND_BASE} (API ${API_BASE})`);
  const { routes, categories, sites } = await discoverRoutes();
  console.log(`Found ${routes.length} routes.`);

  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent:
      'Mozilla/5.0 (compatible; SirSavingsPrerender/1.0; +https://sirsavings.com)',
  });
  const page = await context.newPage();

  for (const route of routes) {
    try {
      const html = await renderRoute(page, route);
      await writeHtml(route, html);
    } catch (err) {
      console.error(`  ✗ ${route}: ${err.message}`);
    }
  }

  await browser.close();

  await writeSitemapAndRobots(categories, sites);
  console.log(`Wrote sitemap.xml (${routes.length} URLs) and robots.txt.`);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
