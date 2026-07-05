import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../api';
import { useLayout } from '../Layout';
import { Sidebar } from '../components/Sidebar';
import { VoucherList } from '../components/VoucherList';
import { httpsUrl, SITE } from '../config';
import type { Site, Voucher } from '../types';

export function SitePage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAdmin, region, categories, showToast } = useLayout();
  const [site, setSite] = useState<Site | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    api
      .getSiteBySlug(slug)
      .then((s) => setSite(s))
      .catch((err) => setError(err instanceof Error ? err.message : 'Not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  const totalCategoryCount = categories.reduce((sum, c) => sum + c.siteCount, 0);
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : httpsUrl(region.domain);

  if (loading) {
    return (
      <div className="app__body">
        <Sidebar categories={categories} totalCategoryCount={totalCategoryCount} />
        <main className="main">
          <div className="loading"><span className="spinner" /> Loading store…</div>
        </main>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="app__body">
        <Sidebar categories={categories} totalCategoryCount={totalCategoryCount} />
        <main className="main">
          <div className="empty">
            <p className="empty__title">Store not found</p>
            <p>{error || 'Try browsing from the home page.'}</p>
            <Link className="btn btn--primary" to="/">Home</Link>
          </div>
        </main>
      </div>
    );
  }

  const canonical = `${siteUrl}/site/${site.slug}`;
  const activeVouchers = vouchers.filter(
    (v) => !v.expiresOn || new Date(v.expiresOn) >= new Date(),
  );

  const title = `${site.name} ${region.term} & discount codes${
    activeVouchers.length ? ` (${activeVouchers.length} active)` : ''
  } | ${SITE.name}`;
  const metaDescription =
    (site.description
      ? site.description.replace(/\s+/g, ' ').slice(0, 140)
      : `Verified ${region.term} for ${site.name}.`) +
    (activeVouchers.length
      ? ` ${activeVouchers.length} active codes — updated ${new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}.`
      : '');

  const offerSchema = activeVouchers.slice(0, 20).map((v) => ({
    '@type': 'Offer',
    name: v.description || `${v.code} voucher code`,
    description: v.description,
    url: `${canonical}#voucher-${v.id}`,
    priceCurrency: region.id === 'uk' ? 'GBP' : 'USD',
    price: 0,
    availability: 'https://schema.org/InStock',
    validThrough: v.expiresOn ?? undefined,
    seller: {
      '@type': 'Organization',
      name: site.name,
      url: site.url,
    },
  }));

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonical} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: SITE.name, item: siteUrl },
              {
                '@type': 'ListItem',
                position: 2,
                name: site.categoryName,
                item: `${siteUrl}/category/${site.categorySlug}`,
              },
              { '@type': 'ListItem', position: 3, name: site.name, item: canonical },
            ],
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `${site.name} ${region.term}`,
            description: metaDescription,
            url: canonical,
            numberOfItems: activeVouchers.length,
            itemListElement: offerSchema.map((offer, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              item: offer,
            })),
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: site.name,
            url: site.url,
            description: site.description,
          })}
        </script>
      </Helmet>

      <div className="app__body">
        <Sidebar categories={categories} totalCategoryCount={totalCategoryCount} />
        <main className="main">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">›</span>
            <Link to={`/category/${site.categorySlug}`}>{site.categoryName}</Link>
            <span aria-hidden="true">›</span>
            <span>{site.name}</span>
          </nav>

          <section className="page-hero">
            <div className="page-hero__meta">
              <Link
                to={`/category/${site.categorySlug}`}
                className="tag"
                style={{ background: site.categoryColor }}
              >
                {site.categoryName}
              </Link>
              <span className="page-hero__eyebrow">
                {activeVouchers.length} active code{activeVouchers.length === 1 ? '' : 's'}
              </span>
            </div>
            <h1>{site.name} {region.term} &amp; discount codes</h1>
            {site.description && <p>{site.description}</p>}
            <p>
              <a
                className="btn btn--small"
                href={site.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                Visit {site.name} ↗
              </a>
            </p>
          </section>

          <VoucherList
            filter={{ siteId: site.id }}
            isAdmin={isAdmin}
            emptyTitle={`No live ${site.name} codes yet`}
            emptyBody={`Nothing live for ${site.name} right now. If you spot a working code, help other shoppers by submitting it.`}
            onError={(msg) => showToast(msg, 'error')}
            onLoaded={(vs) => setVouchers(vs)}
          />
        </main>
      </div>
    </>
  );
}
