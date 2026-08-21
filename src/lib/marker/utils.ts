const URL_TOKENS = [
  ['https://www.abc.net.au/res/sites/news-projects/', '~1'],
  ['https://abc.net.au/dat/news/', '~2'],
  ['https://live-production.wcms.abc-cdn.net.au/', '~3']
] as const;

/**
 * Validates if a URL is allowed (not a preview URL)
 */
export function isValidUrl(url: string | undefined): boolean {
  if (!url) return false;
  return !url.includes('preview.') && !url.includes('preview-');
}

/**
 * Compresses common URL prefixes into tokens
 */
export function compressUrl(url: string): string {
  if (!url) return url;
  for (const [full, token] of URL_TOKENS) {
    if (url.startsWith(full)) {
      return url.replace(full, token);
    }
  }
  return url;
}

/**
 * Decompresses tokens back into full URLs
 */
export function decompressUrl(compressed: string): string {
  if (!compressed) return compressed;
  for (const [full, token] of URL_TOKENS) {
    if (compressed.startsWith(token)) {
      return compressed.replace(token, full);
    }
  }
  return compressed;
}

export interface MapLabelsObject {
  countriesMajor?: boolean;
  countriesMedium?: boolean;
  countriesMinor?: boolean;
  continents?: boolean;
  states?: boolean;
  cities?: boolean;
  towns?: boolean;
  oceans?: boolean;
  nationalBoundaries?: boolean;
  stateBoundaries?: boolean;
}

export const DEFAULT_MAP_LABELS: Record<string, boolean> = {
  countriesMajor: true,
  countriesMedium: true,
  countriesMinor: true,
  continents: false,
  states: false,
  cities: false,
  towns: false,
  oceans: false,
  nationalBoundaries: true,
  stateBoundaries: false
};

export const DISABLED_MAP_LABELS: Record<string, boolean> = {
  countriesMajor: false,
  countriesMedium: false,
  countriesMinor: false,
  continents: false,
  states: false,
  cities: false,
  towns: false,
  oceans: false,
  nationalBoundaries: false,
  stateBoundaries: false
};

/**
 * Determines whether any built-in map labels or boundaries are active.
 */
export function hasMapLabels(labels?: MapLabelsObject | null): boolean {
  if (!labels) return false;
  return Object.values(labels).some(Boolean);
}

