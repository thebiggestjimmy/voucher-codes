import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import { loadAnalytics } from './analytics.ts';
import { Layout } from './Layout';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { SitePage } from './pages/SitePage';
import { SubmitPage } from './pages/SubmitPage';
import { ReviewPage } from './pages/ReviewPage';
import { NotFoundPage } from './pages/NotFoundPage';

loadAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="category/:slug" element={<CategoryPage />} />
            <Route path="site/:slug" element={<SitePage />} />
            <Route path="submit" element={<SubmitPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);
