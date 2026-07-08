import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../api';
import { useLayout } from '../Layout';
import { Sidebar } from '../components/Sidebar';
import { VoucherList } from '../components/VoucherList';
import { httpsUrl, SITE } from '../config';
import type { Category, Site } from '../types';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAdmin, region, categories, sites, showToast } = useLayout();
  const [category, setCategory] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    api
      .getCategoryBySlug(slug)
      .then((c) => setCategory(c))
      .catch((err) => setError(err instanceof Error ? err.message : 'Not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : httpsUrl(region.domain);
  const sitesInCategory: Site[] = sites.filter((s) => s.categoryId === category?.id);

  if (loading) {
    return (
      <div className="app__body">
        <Sidebar categories={categories} />
        <main className="main">
          <div className="loading"><span className="spinner" /> Loading category…</div>
        </main>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="app__body">
        <Sidebar categories={categories} />
        <main className="main">
          <div className="empty">
            <p className="empty__title">Category not found</p>
            <p>{error || 'Try browsing all categories from the sidebar.'}</p>
            <Link className="btn btn--primary" to="/">All categories</Link>
          </div>
        </main>
      </div>
    );
  }

  const canonical = `${siteUrl}/category/${category.slug}`;
  const title = `${category.name} ${region.termTitle} & discount codes | ${SITE.name}`;
  const desc =
    (category.description
      ? category.description.slice(0, 155)
      : `Voucher codes and discount codes for the best ${category.name.toLowerCase()} sites.`);

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={canonical} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: SITE.name, item: siteUrl },
              { '@type': 'ListItem', position: 2, name: category.name, item: canonical },
            ],
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${category.name} ${region.term}`,
            description: category.description,
            url: canonical,
          })}
        </script>
      </Helmet>

      <div className="app__body">
        <Sidebar categories={categories} />
        <main className="main">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">›</span>
            <span>{category.name}</span>
          </nav>

          <section className="page-hero">
            <div className="page-hero__meta">
              <span className="page-hero__dot" style={{ background: category.color }} />
              <span className="page-hero__eyebrow">Category</span>
            </div>
            <h1>{category.name} {region.term}</h1>
            {category.description && <p>{category.description}</p>}
            {sitesInCategory.length > 0 && (
              <div className="chips">
                <span className="chips__label">Popular stores:</span>
                {sitesInCategory.slice(0, 12).map((s) => (
                  <Link key={s.id} to={`/site/${s.slug}`} className="chip">
                    {s.name}
                  </Link>
                ))}
              </div>
            )}
          </section>

          <VoucherList
            filter={{ categoryId: category.id }}
            isAdmin={isAdmin}
            sites={sites}
            emptyTitle={`No ${category.name} ${region.term} yet`}
            emptyBody={`Nothing live for ${category.name} — check back soon or submit one yourself.`}
            onError={(msg) => showToast(msg, 'error')}
          />
        </main>
      </div>
    </>
  );
}
