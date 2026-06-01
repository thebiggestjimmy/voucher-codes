import type { RegionConfig } from '../region';
import { otherRegion, regionUrl } from '../region';

interface Props {
  region: RegionConfig;
}

/**
 * Toggles between the .co.uk and .com sites. On the live domains it links
 * straight to the sibling domain; in local dev it falls back to the
 * `?region=` override so the switch is still previewable.
 */
export function RegionSwitcher({ region }: Props) {
  const other = otherRegion(region);

  const host = window.location.hostname.toLowerCase();
  const isLocal = host === 'localhost' || host.startsWith('127.') || host === '[::1]';
  const href = isLocal ? `?region=${other.id === 'uk' ? 'uk' : 'us'}` : regionUrl(other);

  return (
    <a className="region-switch" href={href} title={`Switch to ${other.label}`}>
      <span className="region-switch__flag" aria-hidden="true">
        {region.flag}
      </span>
      <span className="region-switch__label">{region.label}</span>
      <span className="region-switch__caret" aria-hidden="true">
        ⇄
      </span>
    </a>
  );
}
