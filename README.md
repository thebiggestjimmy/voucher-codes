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
- Sort by **top voted / newest / expiring soon**, toggle expired codes in or out
- **Submit a voucher** — either pick an existing site or add a brand new one (and assign it a category)
- **Add new categories** with a chosen colour swatch
- **Upvote / downvote** existing codes; **one-click copy** to clipboard
- Expiry dates highlighted (orange = soon, red = expired)

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

## Production build

```bash
cd frontend && npm run build
cd ../backend/VoucherCodes.Api && dotnet publish -c Release
```

Serve the built `frontend/dist/` from any static host (or wire it into the API's `wwwroot` if you want a single deployable).
