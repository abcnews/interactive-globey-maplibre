/**
 * Feature Set definitions and utilities for the Highlight Features layer.
 */

export interface FeatureSetItem {
  /** The file name, e.g. 'AUS.geojson' */
  filename: string;
  /** Human-readable feature name, e.g. 'Australia' */
  name: string;
}

export interface FeatureSetDefinition {
  /** Unique ID of the feature set */
  id: string;
  /** Human-readable title of the feature set */
  name: string;
  /** Base CDN URL containing the geojson files and index.json */
  baseUrl: string;
  /** Optional custom index URL (defaults to `${baseUrl}index.json`) */
  indexUrl?: string;
  /** Optional description */
  description?: string;
}

export const DEFAULT_FEATURE_SETS: FeatureSetDefinition[] = [
  {
    id: 'natural-earth-10m-defacto',
    name: 'Countries (10m de-facto boundaries, Natural Earth)',
    baseUrl: 'https://www.abc.net.au/res/sites/news-projects/globey-geojson/naturalearth-10m-defacto/'
  },
  {
    id: 'aus-states',
    name: 'Australian states & territories',
    baseUrl: 'https://www.abc.net.au/res/sites/news-projects/globey-geojson/aus-states/'
  }
];

const indexCache = new Map<string, FeatureSetItem[]>();

/**
 * Fetches and parses the index.json for a given feature set.
 */
export async function fetchFeatureSetIndex(set: FeatureSetDefinition): Promise<FeatureSetItem[]> {
  const cached = indexCache.get(set.id);
  if (cached) return cached;

  const url = set.indexUrl || `${set.baseUrl.replace(/\/$/, '')}/index.json`;
  const res = await fetch(url).catch(() => null);
  if (!res || !res.ok) {
    throw new Error(`Failed to fetch index from ${url}`);
  }

  const rawData = await res.json().catch(() => null);
  if (!Array.isArray(rawData)) {
    throw new Error(`Invalid index format returned from ${url}`);
  }

  // Format: [ [ "ABW.geojson", "Aruba" ], ... ]
  const items: FeatureSetItem[] = rawData
    .filter((entry): entry is [string, string] => Array.isArray(entry) && entry.length >= 2)
    .map(([filename, name]) => ({
      filename,
      name: String(name)
    }));

  indexCache.set(set.id, items);
  return items;
}

/**
 * Searches items in a feature set by name.
 */
export function searchFeatureSetItems(items: FeatureSetItem[], query: string): FeatureSetItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  return items.filter(item => item.name.toLowerCase().includes(q));
}

/**
 * Returns the absolute URL for a given feature item in a feature set.
 */
export function getFeatureFileUrl(set: FeatureSetDefinition, item: FeatureSetItem): string {
  const base = set.baseUrl.replace(/\/$/, '');
  return `${base}/${item.filename}`;
}
