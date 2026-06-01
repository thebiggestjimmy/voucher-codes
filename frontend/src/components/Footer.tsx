import type { Category } from '../types';
import type { RegionConfig } from '../region';
import { SITE } from '../config';
import { Logo } from './Logo';
import { RegionSwitcher } from './RegionSwitcher';

interface Props {
  region: RegionConfig;
  categories: Category[];
  onPickCategory: (id: number | null) => void;
  onSubmit: () => void;
}

export function Footer({ region, categories, onPickCategory, onSubmit }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Logo size={34} withWordmark />
          <p className="footer__tagline">
            {SITE.tagline} Free, community-verified {region.term} for {region.audience}.
          </p>
          <RegionSwitcher region={region} />
        </div>

        <nav className="footer__col" aria-label="Popular categories">
          <h4 className="footer__heading">Popular categories</h4>
          <ul>
            {categories.slice(0, 5).map((c) => (
              <li key={c.id}>
                <button className="footer__link" onClick={() => onPickCategory(c.id)}>
                  {c.name} {region.term}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="footer__col" aria-label="Site">
          <h4 className="footer__heading">SirSavings</h4>
          <ul>
            <li>
              <a className="footer__link" href="#how-it-works">
                How it works
              </a>
            </li>
            <li>
              <button className="footer__link" onClick={() => onPickCategory(null)}>
                Browse all deals
              </button>
            </li>
            <li>
              <button className="footer__link" onClick={onSubmit}>
                Share a code
              </button>
            </li>
            <li>
              <a className="footer__link" href={`mailto:${SITE.email}`}>
                Contact us
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="footer__bar">
        <span>
          © {year} {SITE.name}. {SITE.tagline}
        </span>
        <span className="footer__fineprint">
          Codes are submitted and verified by the community — always check terms at the retailer.
        </span>
      </div>
    </footer>
  );
}
