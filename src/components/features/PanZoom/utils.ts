import type * as maplibregl from 'maplibre-gl';
import type { ViewState, FitMode } from './types.ts';

export const WORLD_SIZE_AT_ZOOM_0 = 512;
export const LONGITUDE_SPAN_DEGREES = 360;
export const MERCATOR_SPAN_UNITS = 2 * Math.PI;
export const CALCULATION_EPSILON = 0.0001;
export const GLOBE_FIT_PADDING_PX = -20;

export function latToMercator(lat: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

export function getBoundingBox(points: [number, number][]) {
  const lats = points.map(p => p[1]);
  const lngs = points.map(p => p[0]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  return {
    minLng,
    maxLng,
    minLat,
    maxLat,
    centre: [(minLng + maxLng) / 2, (minLat + maxLat) / 2] as [number, number]
  };
}

export function calculateTargetView(
  points: [number, number][],
  width: number,
  height: number,
  mode: FitMode = 'fit'
): ViewState | null {
  if (!points || points.length === 0) return null;

  const { minLng, maxLng, minLat, maxLat, centre } = getBoundingBox(points);

  const deltaLng = Math.abs(maxLng - minLng) || CALCULATION_EPSILON;
  const zoomLng = Math.log2((width * LONGITUDE_SPAN_DEGREES) / (WORLD_SIZE_AT_ZOOM_0 * deltaLng));

  const deltaY = Math.abs(latToMercator(maxLat) - latToMercator(minLat)) || CALCULATION_EPSILON;
  const zoomLat = Math.log2((height * MERCATOR_SPAN_UNITS) / (WORLD_SIZE_AT_ZOOM_0 * deltaY));

  const zoom = mode === 'fit' ? Math.min(zoomLng, zoomLat) : Math.max(zoomLng, zoomLat);

  return { center: centre, zoom };
}

export function calculateGlobeFitZoom(map: maplibregl.Map, coords?: [number, number]): number {
  const container = map.getContainer();
  if (!container) return 0;

  const width = container.clientWidth;
  const height = container.clientHeight;

  const targetDiameterPx = Math.min(width, height) - GLOBE_FIT_PADDING_PX * 2;

  const currentCenter = map.getCenter();
  const currentLat = coords ? coords[1] : currentCenter.lat;
  const latRad = (currentLat * Math.PI) / 180;
  const mercatorScaleCorrection = Math.cos(latRad);

  const requiredWorldCircumferencePx = targetDiameterPx * Math.PI * mercatorScaleCorrection;

  return Math.log2(requiredWorldCircumferencePx / WORLD_SIZE_AT_ZOOM_0);
}

export function isProgrammaticMove(eventData: any): boolean {
  return !!(eventData?.builderInitiated || eventData?.essential);
}
