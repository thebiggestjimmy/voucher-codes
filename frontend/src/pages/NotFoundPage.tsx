import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useLayout } from '../Layout';
import { Sidebar } from '../components/Sidebar';

export function NotFoundPage() {
  const { categories } = useLayout();
  const totalCategoryCount = categories.reduce((sum, c) => sum + c.siteCount, 0);

  return (
    <>
      <Helmet>
        <title>Page not found</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="app__body">
        <Sidebar categories={categories} totalCategoryCount={totalCategoryCount} />
        <main className="main">
          <div className="empty">
            <p className="empty__title">Page not found</p>
            <p>The URL you tried doesn't match any category, store or page here.</p>
            <Link className="btn btn--primary" to="/">Back to home</Link>
          </div>
        </main>
      </div>
    </>
  );
}
