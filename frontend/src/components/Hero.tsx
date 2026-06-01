import type { FormEvent } from 'react';
import type { RegionConfig } from '../region';

interface Stats {
  codes: number;
  stores: number;
  categories: number;
}

interface Props {
  region: RegionConfig;
  search: string;
  setSearch: (value: string) => void;
  stats: Stats;
  onBrowse: () => void;
  onSubmit: () => void;
}

const nf = (n: number, locale: string) => new Intl.NumberFormat(locale).format(n);

export function Hero({ region, search, setSearch, stats, onBrowse, onSubmit }: Props) {
  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    onBrowse();
  };

  return (
    <section className="hero">
      <div className="hero__inner">
        <div className="hero__copy">
          <span className="hero__eyebrow">
            <span className="hero__pulse" /> Verified daily · Free forever
          </span>
          <h1 className="hero__title">
            Unlock free {region.term} for{' '}
            <span className="hero__title-accent">{region.audience}</span>
          </h1>
          <p className="hero__subtitle">
            Thousands of community-checked discount codes, ranked by what actually works.
            Search, copy, and save in seconds — no sign-up, no spam.
          </p>

          <form className="hero__search" onSubmit={submitSearch} role="search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search a store or brand — e.g. ASOS, Amazon, IKEA`}
              aria-label="Search for a store or code"
            />
            <button type="submit" className="btn btn--primary btn--lg">
              Find codes
            </button>
          </form>

          <div className="hero__actions">
            <button className="btn btn--ghost-light" onClick={onBrowse}>
              Browse all deals ↓
            </button>
            <button className="btn btn--gold" onClick={onSubmit}>
              + Share a code
            </button>
          </div>

          <ul className="hero__stats">
            <li>
              <strong>{nf(stats.codes, region.locale)}+</strong>
              <span>live {region.term}</span>
            </li>
            <li>
              <strong>{nf(stats.stores, region.locale)}</strong>
              <span>stores tracked</span>
            </li>
            <li>
              <strong>{nf(stats.categories, region.locale)}</strong>
              <span>categories</span>
            </li>
          </ul>
        </div>

        <div className="hero__visual" aria-hidden="true">
          <div className="hero__card hero__card--back">
            <span className="hero__card-tag">Travel</span>
            <span className="hero__card-code">STAY15</span>
            <span className="hero__card-desc">15% off stays in Europe</span>
          </div>
          <div className="hero__card hero__card--front">
            <div className="hero__card-votes">
              <span>▲</span>
              <strong>21</strong>
              <span>▼</span>
            </div>
            <div>
              <span className="hero__card-tag hero__card-tag--food">Food &amp; Drink</span>
              <span className="hero__card-code">TWOFORONE</span>
              <span className="hero__card-desc">Buy one get one free on large pizzas</span>
            </div>
            <span className="hero__card-copy">Copy</span>
          </div>
        </div>
      </div>
    </section>
  );
}
