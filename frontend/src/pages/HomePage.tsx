import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLayout } from '../Layout';
import { Hero } from '../components/Hero';
import { HowItWorks } from '../components/HowItWorks';
import { Sidebar } from '../components/Sidebar';
import { VoucherList } from '../components/VoucherList';
import { SITE, httpsUrl } from '../config';
import { api } from '../api';

export function HomePage() {
  const {
    isAdmin,
    region,
    categories,
    showToast,
    scrollToBrowse,
    browseRef,
    searchRef,
  } = useLayout();

  const [totalCodes, setTotalCodes] = useState(0);
  const [search, setSearch] = useState(
    () => new URLSearchParams(window.location.search).get('q') ?? '',
  );
  const totalCategoryCount = categories.reduce((sum, c) => sum + c.siteCount, 0);

  useEffect(() => {
    api.listVouchers({ includeExpired: true })
      .then((all) => setTotalCodes(all.length))
      .catch(() => { /* hero shows what it can */ });
  }, []);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : httpsUrl(region.domain);
  const categoryList = categories.map((c) => c.name).join(', ');

  return (
    <>
      <Helmet>
        <title>{region.metaTitle}</title>
        <meta name="description" content={region.metaDescription} />
        <link rel="canonical" href={`${siteUrl}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={region.metaTitle} />
        <meta property="og:description" content={region.metaDescription} />
        <meta property="og:url" content={`${siteUrl}/`} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE.name,
            url: siteUrl,
            description: region.metaDescription,
            potentialAction: {
              '@type': 'SearchAction',
              target: `${siteUrl}/?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          })}
        </script>
      </Helmet>

      <span id="top" />

      <Hero
        region={region}
        search={search}
        setSearch={setSearch}
        stats={{ codes: totalCodes, stores: totalCategoryCount, categories: categories.length }}
        onBrowse={scrollToBrowse}
        onSubmit={() => window.location.assign('/submit')}
      />

      <HowItWorks region={region} />

      <div className="app__body" ref={browseRef} id="browse">
        <Sidebar categories={categories} totalCategoryCount={totalCategoryCount} />
        <main className="main">
          <div className="main__head">
            <h2 className="main__title">Latest {region.term}</h2>
          </div>
          <p className="page-intro__lead">
            Browse community-submitted {region.term} for {categoryList || 'the biggest online stores'}.
            Every code is upvoted or downvoted by real people — the best-performing codes rise to the top.
          </p>
          <VoucherList
            filter={{}}
            isAdmin={isAdmin}
            searchInputRef={searchRef}
            controlledSearch={search}
            onSearchChange={setSearch}
            onError={(msg) => showToast(msg, 'error')}
          />
        </main>
      </div>
    </>
  );
}
