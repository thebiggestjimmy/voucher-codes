// Optional, privacy-friendly analytics (self-hosted Umami).
//
// Both values are injected at BUILD time from VITE_UMAMI_* env vars (see
// docker-compose build args + .env). When either is missing the snippet is
// never added, so local dev and un-configured builds stay clean and
// tracking-free. Umami sets no cookies and collects no personal data, so no
// consent banner is required.
export function loadAnalytics() {
  const env = import.meta.env as Record<string, string | undefined>;
  const src = env.VITE_UMAMI_SRC;
  const websiteId = env.VITE_UMAMI_WEBSITE_ID;
  if (!src || !websiteId) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = src;
  script.dataset.websiteId = websiteId;
  document.head.appendChild(script);
}
