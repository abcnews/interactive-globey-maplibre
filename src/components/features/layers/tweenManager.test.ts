import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { linear } from 'svelte/easing';
import {
  isColourValue,
  tweenLayer,
  tweenFeatureState,
  cancelLayerTweens,
  cancelFeatureStateTweens,
  cancelAllTweens,
  getActiveTweenCount
} from './tweenManager.ts';

/**
 * Creates a mock MapLibre Map instance for testing layer and feature-state animations.
 */
function createMockMap(layerIds: string[] = []) {
  const layers = new Set(layerIds);
  const paintProperties = new Map<string, Map<string, unknown>>();
  const featureStates = new Map<string, Map<string | number, Record<string, unknown>>>();

  return {
    getLayer: vi.fn((id: string) => (layers.has(id) ? { id } : undefined)),
    getPaintProperty: vi.fn((layerId: string, property: string) => {
      return paintProperties.get(layerId)?.get(property);
    }),
    setPaintProperty: vi.fn((layerId: string, property: string, value: unknown) => {
      if (!paintProperties.has(layerId)) {
        paintProperties.set(layerId, new Map());
      }
      paintProperties.get(layerId)!.set(property, value);
    }),
    getFeatureState: vi.fn(({ source, id }: { source: string; id: string | number }) => {
      return featureStates.get(source)?.get(id) || {};
    }),
    setFeatureState: vi.fn(
      ({ source, id }: { source: string; id: string | number }, state: Record<string, unknown>) => {
        if (!featureStates.has(source)) {
          featureStates.set(source, new Map());
        }
        const sourceMap = featureStates.get(source)!;
        const current = sourceMap.get(id) || {};
        sourceMap.set(id, { ...current, ...state });
      }
    ),
    _removeLayerMock: (id: string) => layers.delete(id)
  } as unknown as MapLibreMap;
}

describe('TweenManager - Helper Functions', () => {
  it('detects colour values accurately', () => {
    expect(isColourValue('#fff')).toBe(true);
    expect(isColourValue('#FFCC00')).toBe(true);
    expect(isColourValue('rgba(0, 0, 0, 0.8)')).toBe(true);
    expect(isColourValue('rgb(255, 0, 0)')).toBe(true);
    expect(isColourValue(0)).toBe(false);
    expect(isColourValue(1)).toBe(false);
    expect(isColourValue('0.5')).toBe(false);
  });
});

describe('TweenManager - Layer Paint Properties (`tweenLayer`)', () => {
  let originalRaf: typeof requestAnimationFrame;
  let originalCaf: typeof cancelAnimationFrame;
  let rafCallbacks: Array<(time: number) => void> = [];
  let rafCounter = 0;

  beforeEach(() => {
    cancelAllTweens();
    rafCallbacks = [];
    rafCounter = 0;

    originalRaf = globalThis.requestAnimationFrame;
    originalCaf = globalThis.cancelAnimationFrame;

    vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
      rafCallbacks.push(cb);
      return ++rafCounter;
    });

    vi.stubGlobal('cancelAnimationFrame', () => {
      rafCallbacks = [];
    });
  });

  afterEach(() => {
    cancelAllTweens();
    vi.stubGlobal('requestAnimationFrame', originalRaf);
    vi.stubGlobal('cancelAnimationFrame', originalCaf);
  });

  function stepFrames(time: number) {
    const currentCallbacks = [...rafCallbacks];
    rafCallbacks = [];
    currentCallbacks.forEach(cb => cb(time));
  }

  it('fades in layer with explicit startProperties', async () => {
    const map = createMockMap(['satellite-layer']);
    const startTimestamp = 1000;
    vi.spyOn(performance, 'now').mockReturnValue(startTimestamp);

    const tween = tweenLayer({
      map,
      layerId: 'satellite-layer',
      startProperties: { 'raster-opacity': 0 },
      properties: { 'raster-opacity': 1 },
      duration: 200,
      easing: linear
    });

    // Immediate start property application
    expect(map.setPaintProperty).toHaveBeenCalledWith('satellite-layer', 'raster-opacity', 0);
    expect(getActiveTweenCount(map)).toBe(1);

    // Halfway
    stepFrames(startTimestamp + 100);
    expect(map.setPaintProperty).toHaveBeenCalledWith('satellite-layer', 'raster-opacity', 0.5);

    // Completion
    stepFrames(startTimestamp + 200);
    expect(map.setPaintProperty).toHaveBeenCalledWith('satellite-layer', 'raster-opacity', 1);

    const completed = await tween;
    expect(completed).toBe(true);
    expect(getActiveTweenCount(map)).toBe(0);
  });

  it('animates multiple layer IDs simultaneously in a single call', async () => {
    const map = createMockMap(['gj-fill', 'gj-outline']);
    const startTimestamp = 1000;
    vi.spyOn(performance, 'now').mockReturnValue(startTimestamp);

    const tween = tweenLayer({
      map,
      layerId: ['gj-fill', 'gj-outline'],
      startProperties: { 'fill-opacity': 0 },
      properties: { 'fill-opacity': 1 },
      duration: 100,
      easing: linear
    });

    stepFrames(startTimestamp + 100);
    const completed = await tween;
    expect(completed).toBe(true);

    expect(map.setPaintProperty).toHaveBeenCalledWith('gj-fill', 'fill-opacity', 1);
    expect(map.setPaintProperty).toHaveBeenCalledWith('gj-outline', 'fill-opacity', 1);
  });

  it('cancels in-flight layer tween using .cancel()', async () => {
    const map = createMockMap(['layer-1']);
    const startTimestamp = 1000;
    vi.spyOn(performance, 'now').mockReturnValue(startTimestamp);

    const tween = tweenLayer({
      map,
      layerId: 'layer-1',
      properties: { 'raster-opacity': 1 },
      duration: 500
    });

    stepFrames(startTimestamp + 200);
    tween.cancel();

    expect(getActiveTweenCount(map)).toBe(0);
    const completed = await tween;
    expect(completed).toBe(false);
  });
});

describe('TweenManager - Feature State (`tweenFeatureState`)', () => {
  let originalRaf: typeof requestAnimationFrame;
  let originalCaf: typeof cancelAnimationFrame;
  let rafCallbacks: Array<(time: number) => void> = [];
  let rafCounter = 0;

  beforeEach(() => {
    cancelAllTweens();
    rafCallbacks = [];
    rafCounter = 0;

    originalRaf = globalThis.requestAnimationFrame;
    originalCaf = globalThis.cancelAnimationFrame;

    vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
      rafCallbacks.push(cb);
      return ++rafCounter;
    });

    vi.stubGlobal('cancelAnimationFrame', () => {
      rafCallbacks = [];
    });
  });

  afterEach(() => {
    cancelAllTweens();
    vi.stubGlobal('requestAnimationFrame', originalRaf);
    vi.stubGlobal('cancelAnimationFrame', originalCaf);
  });

  function stepFrames(time: number) {
    const currentCallbacks = [...rafCallbacks];
    rafCallbacks = [];
    currentCallbacks.forEach(cb => cb(time));
  }

  it('animates single custom label feature-state with startState', async () => {
    const map = createMockMap();
    const startTimestamp = 1000;
    vi.spyOn(performance, 'now').mockReturnValue(startTimestamp);

    const tween = tweenFeatureState({
      map,
      source: 'custom-labels',
      id: 'Australia',
      startState: { textColor: '#ffffff', textOpacity: 0 },
      state: { textColor: '#ff0000', textOpacity: 1 },
      duration: 200,
      easing: linear
    });

    // Start values applied immediately
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'custom-labels', sourceLayer: undefined, id: 'Australia' },
      { textColor: '#ffffff' }
    );
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'custom-labels', sourceLayer: undefined, id: 'Australia' },
      { textOpacity: 0 }
    );

    // Halfway
    stepFrames(startTimestamp + 100);
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'custom-labels', sourceLayer: undefined, id: 'Australia' },
      { textOpacity: 0.5 }
    );

    // Finish
    stepFrames(startTimestamp + 200);
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'custom-labels', sourceLayer: undefined, id: 'Australia' },
      { textColor: 'rgb(255, 0, 0)' }
    );
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'custom-labels', sourceLayer: undefined, id: 'Australia' },
      { textOpacity: 1 }
    );

    const completed = await tween;
    expect(completed).toBe(true);
    expect(getActiveTweenCount(map)).toBe(0);
  });

  it('animates multiple GeoJSON feature IDs simultaneously', async () => {
    const map = createMockMap();
    const startTimestamp = 1000;
    vi.spyOn(performance, 'now').mockReturnValue(startTimestamp);

    const tween = tweenFeatureState({
      map,
      source: 'gj-countries',
      id: ['AUS', 'NZL'],
      startState: { fillOpacity: 0 },
      state: { fillOpacity: 0.8 },
      duration: 100,
      easing: linear
    });

    stepFrames(startTimestamp + 100);
    const completed = await tween;
    expect(completed).toBe(true);

    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'gj-countries', sourceLayer: undefined, id: 'AUS' },
      { fillOpacity: 0.8 }
    );
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'gj-countries', sourceLayer: undefined, id: 'NZL' },
      { fillOpacity: 0.8 }
    );
  });

  it('supports cancellation with cancelFeatureStateTweens', async () => {
    const map = createMockMap();
    const startTimestamp = 1000;
    vi.spyOn(performance, 'now').mockReturnValue(startTimestamp);

    const tween = tweenFeatureState({
      map,
      source: 'custom-labels',
      id: 'Australia',
      state: { textColor: '#FFCC00' },
      duration: 1000
    });

    expect(getActiveTweenCount(map)).toBe(1);
    cancelFeatureStateTweens(map, 'custom-labels', 'Australia');

    expect(getActiveTweenCount(map)).toBe(0);
    const completed = await tween;
    expect(completed).toBe(false);
  });
});
