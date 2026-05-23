import { useState } from 'react';
import type { Voucher } from '../types';

interface Props {
  voucher: Voucher;
  onVote: (direction: 'up' | 'down') => void;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function VoucherCard({ voucher, onVote }: Props) {
  const [copied, setCopied] = useState(false);
  const score = voucher.upvotes - voucher.downvotes;
  const days = daysUntil(voucher.expiresOn);
  const isExpired = days !== null && days < 0;
  const isExpiring = days !== null && days >= 0 && days <= 7;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <article className="voucher">
      <div className="voucher__votes">
        <button
          type="button"
          className="voucher__vote-btn"
          aria-label="Upvote"
          onClick={() => onVote('up')}
        >
          ▲
        </button>
        <span className="voucher__score">{score}</span>
        <button
          type="button"
          className="voucher__vote-btn"
          aria-label="Downvote"
          onClick={() => onVote('down')}
        >
          ▼
        </button>
      </div>

      <div className="voucher__main">
        <div className="voucher__top">
          <span className="voucher__code">{voucher.code}</span>
          <span className="voucher__site">
            <a href={voucher.siteUrl} target="_blank" rel="noreferrer noopener">
              {voucher.siteName}
            </a>
          </span>
          <span className="tag" style={{ background: voucher.categoryColor }}>
            {voucher.categoryName}
          </span>
        </div>

        {voucher.description && (
          <p className="voucher__desc">{voucher.description}</p>
        )}

        <div className="voucher__meta">
          <span>Submitted by {voucher.submittedBy}</span>
          {voucher.expiresOn && (
            <span
              className={
                isExpired
                  ? 'voucher__expired'
                  : isExpiring
                    ? 'voucher__expiring'
                    : ''
              }
            >
              {isExpired
                ? `Expired ${formatDate(voucher.expiresOn)}`
                : `Expires ${formatDate(voucher.expiresOn)}`}
            </span>
          )}
          <span>{voucher.upvotes} up · {voucher.downvotes} down</span>
        </div>
      </div>

      <div className="voucher__actions">
        <button
          type="button"
          className={`copy-btn ${copied ? 'copy-btn--copied' : ''}`}
          onClick={copy}
        >
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>
    </article>
  );
}
