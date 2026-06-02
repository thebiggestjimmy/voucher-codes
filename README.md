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
dotnet run
```

It listens on `http://localhost:5080`. On first start it creates `vouchers.db` and seeds a handful of sample categories, sites, and vouchers. Swagger UI is at `http://localhost:5080/swagger`.

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

## API endpoints

| Method | Path                              | Purpose                                   |
| ------ | --------------------------------- | ----------------------------------------- |
| GET    | `/api/categories`                 | List all categories with site counts      |
| POST   | `/api/categories`                 | Create a category                         |
| GET    | `/api/sites?categoryId=&search=`  | List sites (optionally filtered)          |
| POST   | `/api/sites`                      | Create a site                             |
| GET    | `/api/vouchers?...`               | List vouchers (filter + sort + search)    |
| POST   | `/api/vouchers`                   | Submit a voucher                          |
| POST   | `/api/vouchers/{id}/vote`         | Upvote or downvote a voucher              |
| POST   | `/api/vouchers/{id}/redeem`       | Record an anonymous copy (usage counter)  |

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
