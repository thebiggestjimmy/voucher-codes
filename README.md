# SirSavings

> Smart savings, sorted.

A polished web app for finding and sharing **voucher / promo codes**, organised by
category and ranked by community votes.

- **Frontend**: React + TypeScript (Vite)
- **Backend**: ASP.NET Core 8 Web API (C#)
- **Database**: SQLite via Entity Framework Core (file auto-created on first run)

## Branding & regions

The site is built to run on **two domains from a single build**:

| Domain               | Region        | Locale | Currency | Terminology   |
| -------------------- | ------------- | ------ | -------- | ------------- |
| `sirsavings.co.uk`   | United Kingdom | en-GB | £        | voucher codes |
| `sirsavings.com`     | International  | en-US | $        | promo codes   |

Region is detected from the hostname at runtime (`frontend/src/region.ts`); append
`?region=uk` or `?region=us` to preview either variant locally. All brand/domain
config lives in **one place** — `frontend/src/config.ts`. If your real domains differ,
change them there and in the static SEO files under `frontend/public/`.

## SEO

The site ships with a full on-page SEO baseline:

- Regional `<title>`, meta description & keywords (rewritten per-domain at runtime).
- Open Graph + Twitter cards with a generated `public/og-image.png` (1200×630).
- `hreflang` pairs linking the `.co.uk` and `.com` variants (`x-default` → `.com`).
- Self-referential `canonical` set to the live origin.
- JSON-LD `WebSite` (with Sitelinks Searchbox via `/?q=`) and `Organization`.
- `robots.txt`, `sitemap.xml` (with regional alternates), and a PWA `site.webmanifest`.
- A `<noscript>` crawlable fallback so the page is never empty to a bot.

To regenerate the social image after editing `public/og-image.svg`:

```bash
cd frontend
npm i --no-save @resvg/resvg-js
node -e "import('@resvg/resvg-js').then(({Resvg})=>{const fs=require('fs');const r=new Resvg(fs.readFileSync('public/og-image.svg','utf8'),{fitTo:{mode:'width',value:1200}});fs.writeFileSync('public/og-image.png',r.render().asPng())})"
```

## Project structure

```
backend/VoucherCodes.Api    # C# Web API + EF Core + SQLite
frontend/                   # Vite React TS SPA
```

## Running locally

You'll need **.NET 8 SDK** and **Node 20+**.

### 1. Start the API

```bash
cd backend/VoucherCodes.Api
ADMIN_PASSWORD=your-password-here dotnet run
```

It listens on `http://localhost:5080`. On first start it creates `vouchers.db` and seeds a handful of sample categories, sites, and vouchers. Swagger UI is at `http://localhost:5080/swagger`.

Set the admin password via the `ADMIN_PASSWORD` environment variable (or `Admin:Password` in `appsettings.json`). If neither is set, the password falls back to `changeme` and a warning is logged at startup.

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api/*` to the API, so no CORS hassle in dev.

## Features

- Browse vouchers, filter by **category**, search across codes / sites / descriptions
- Sort by **top voted / most used / newest / expiring soon**, toggle expired codes in or out
- **Submit a voucher** — either pick an existing site or add a brand new one (and assign it a category)
- **Add new categories** with a chosen colour swatch
- **Upvote / downvote** existing codes; **one-click copy** to clipboard
- Expiry dates highlighted (orange = soon, red = expired)
- **Anonymous usage counts** — each copy bumps a per-voucher counter ("Used N
  times") and powers the *Most used* sort. No identifiers stored, no consent
  banner needed.
- **Moderation workflow** — seeded codes are pre-approved and visible; user-submitted codes go into a hidden pending queue and only appear once an admin approves them via the **Review** button in the header.
- **Password-protected admin area** — sign in from the header to reveal Review, category management, and voucher deletion. Codes an admin submits are published immediately; codes anonymous users submit still go through moderation.
- **Per-URL SEO** — real crawlable URLs (`/category/:slug`, `/site/:slug`), per-page `<title>` / `<meta>` / OpenGraph via `react-helmet-async`, JSON-LD structured data (`Offer`, `ItemList`, `BreadcrumbList`, `Organization`, `CollectionPage`, `WebSite`), and a build-time prerender step (`npm run build:seo`) that emits fully-rendered HTML per URL plus a live `sitemap.xml` + `robots.txt`. Complements the regional shell SEO already in `src/seo.ts`.

### Personal Finance + Tide

The seeder ships a **Personal Finance** category (Tide, Monzo, Starling Bank) with
starter codes (`TIDE100`, `TIDEFREE`, `TIDEREF50`, `MONZO5`, `STARLING10`). Like the
Fitness Trackers top-up, it runs idempotently on every startup so it also lands on
already-populated production databases.

## API endpoints

Admin-only endpoints require an `Authorization: Bearer <token>` header — the token is returned by `/api/admin/login`.

| Method | Path                                   | Auth  | Purpose                                                          |
| ------ | -------------------------------------- | ----- | ---------------------------------------------------------------- |
| POST   | `/api/admin/login`                     | —     | Exchange the admin password for a session token                   |
| GET    | `/api/admin/me`                        | admin | Check whether the current token is still valid                    |
| POST   | `/api/admin/logout`                    | —     | Invalidate the caller's token                                     |
| GET    | `/api/categories`                      | —     | List all categories with site counts                              |
| GET    | `/api/categories/by-slug/{slug}`       | —     | Look up a category by URL slug                                    |
| POST   | `/api/categories`                      | admin | Create a category                                                 |
| PUT    | `/api/categories/{id}`                 | admin | Rename / recolour / redescribe a category                          |
| DELETE | `/api/categories/{id}`                 | admin | Delete a category (must be empty)                                 |
| GET    | `/api/sites?categoryId=&search=`       | —     | List sites (optionally filtered)                                  |
| GET    | `/api/sites/by-slug/{slug}`            | —     | Look up a site by URL slug                                        |
| POST   | `/api/sites`                           | —     | Create a site                                                     |
| GET    | `/api/vouchers?...&status=approved`    | —     | List approved vouchers (`status=pending\|all` requires admin)     |
| GET    | `/api/vouchers/pending-count`          | admin | How many vouchers are waiting for review                          |
| POST   | `/api/vouchers`                        | mixed | Submit a voucher — anonymous → pending; admin → auto-approved     |
| POST   | `/api/vouchers/{id}/vote`              | —     | Upvote or downvote                                                |
| POST   | `/api/vouchers/{id}/redeem`            | —     | Record an anonymous copy (usage counter)                          |
| POST   | `/api/vouchers/{id}/approve`           | admin | Approve a pending voucher                                         |
| DELETE | `/api/vouchers/{id}`                   | admin | Reject / delete a voucher                                         |

## Per-URL SEO / prerender pipeline

The regional shell SEO (in `src/seo.ts`) handles the domain-level branding — title, hreflang, OG, JSON-LD `WebSite` + `Organization`. On top of that, every page mounts its own `react-helmet-async` `<Helmet>` with page-specific `<title>`, `meta description`, `canonical`, OpenGraph tags, and JSON-LD (`Offer`, `ItemList`, `BreadcrumbList`, `CollectionPage`).

`npm run build:seo` runs `vite build` and then a headless-Chromium prerender step that walks every URL, waits for data to settle, dedupes the head, rewrites `localhost` to `PUBLIC_BASE`, and writes:

- `dist/<route>/index.html` per URL (home, `/submit`, every `/category/:slug`, every `/site/:slug`)
- `dist/sitemap.xml` listing all of the above with priorities
- `dist/robots.txt` pointing at the sitemap

```bash
# terminal 1
cd backend/VoucherCodes.Api && ADMIN_PASSWORD=letmein dotnet run

# terminal 2
cd frontend
npm run build             # SPA shell
npm run preview -- --port 4173 &
API_BASE=http://localhost:5080 \
FRONTEND_BASE=http://localhost:4173 \
PUBLIC_BASE=https://sirsavings.com \
npm run prerender
```

Serve `dist/` from any static host — nginx, Caddy, S3, Cloudflare Pages. Every `/category/:slug` and `/site/:slug` URL now serves fully-rendered HTML (with the correct `<title>`, description, canonical, OpenGraph tags, JSON-LD schemas and visible voucher content) before React hydrates on top.

## Production build

```bash
cd frontend && npm run build
cd ../backend/VoucherCodes.Api && dotnet publish -c Release
```

Serve the built `frontend/dist/` from any static host (or wire it into the API's `wwwroot` if you want a single deployable).

## Docker / VPS deployment

The whole stack is containerised in `docker-compose.yml`:

| Container        | Role                                                            |
| ---------------- | --------------------------------------------------------------- |
| `sirsavings-api` | ASP.NET Core API, listens on `:8080`, SQLite on a named volume. |
| `sirsavings-web` | nginx serving the built SPA **and** proxying `/api` → the API.  |

The site is **single-origin**: the browser only ever talks to `sirsavings-web`,
which forwards `/api/*` to `sirsavings-api` over the private `internal` network.
Only `sirsavings-web` is attached to the shared external **`web`** network, so
[Caddy](https://caddyserver.com/) reaches it by container name.

```bash
# On the VPS (the "web" network is created by your Caddy stack;
# run `docker network create web` first if it doesn't exist yet):
docker compose up -d --build
```

Then add the site block from [`deploy/Caddyfile.example`](deploy/Caddyfile.example)
to your Caddyfile:

```caddy
sirsavings.com, www.sirsavings.com, sirsavings.co.uk, www.sirsavings.co.uk {
	encode zstd gzip
	reverse_proxy sirsavings-web:80
}
```

Both domains point at the same container — the SPA selects UK vs international
copy from the request hostname. The SQLite database persists in the
`vouchers-data` volume across redeploys.

### Analytics (self-hosted Umami)

The compose stack includes an optional [Umami](https://umami.is/) instance
(`sirsavings-umami` + a Postgres `sirsavings-umami-db`). Umami is cookie-free
and stores no personal data, so it needs **no consent banner**. Setup:

1. `cp .env.example .env` and set a strong `UMAMI_DB_PASSWORD` + `UMAMI_APP_SECRET`.
2. `docker compose up -d --build` — this also starts Umami.
3. Add the `analytics.<your-domain>` block from `deploy/Caddyfile.example` and
   reload Caddy.
4. Open `https://analytics.<your-domain>`, log in (default `admin` / `umami` —
   **change it immediately**), and add a website.
5. Copy that website's **Website ID** into `.env` (`UMAMI_WEBSITE_ID=…`), keep
   `UMAMI_SCRIPT_URL` pointing at `https://analytics.<your-domain>/script.js`,
   then `docker compose up -d --build frontend` to bake the snippet in.

If `UMAMI_WEBSITE_ID` is blank the frontend ships with **no** analytics snippet,
so local/dev builds stay tracking-free.

> **First-party vs Umami:** the per-voucher "Used N times" counters live in the
> app's own SQLite DB (great for product engagement and the *Most used* sort);
> Umami covers site-wide traffic, sources and SEO performance. They're
> complementary.
