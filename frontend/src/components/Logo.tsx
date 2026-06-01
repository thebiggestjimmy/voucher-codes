interface Props {
  /** Pixel size of the square mark. */
  size?: number;
  /** Show the "SirSavings" wordmark next to the mark. */
  withWordmark?: boolean;
  className?: string;
}

/**
 * SirSavings brand mark: an indigo→violet squircle carrying a gold crown —
 * the regal "Sir" cue paired with a trustworthy, premium feel. Rendered inline
 * so it stays crisp at any size and can adopt currentColor for the wordmark.
 */
export function Logo({ size = 36, withWordmark = false, className }: Props) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="SirSavings"
      className="logo__mark"
    >
      <defs>
        <linearGradient id="ss-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5b54f2" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="ss-crown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="48" height="48" rx="13" fill="url(#ss-bg)" />
      <g fill="url(#ss-crown)">
        <path d="M11 32 L11 19 L18.5 25 L24 14 L29.5 25 L37 19 L37 32 Z" />
        <rect x="11" y="32.5" width="26" height="4.5" rx="2.25" />
      </g>
      <g fill="#fffbeb">
        <circle cx="11" cy="18.5" r="2.2" />
        <circle cx="24" cy="13.5" r="2.4" />
        <circle cx="37" cy="18.5" r="2.2" />
      </g>
    </svg>
  );

  if (!withWordmark) return mark;

  return (
    <span className={`logo ${className ?? ''}`}>
      {mark}
      <span className="logo__word">
        Sir<span className="logo__word-accent">Savings</span>
      </span>
    </span>
  );
}
