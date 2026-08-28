import type { Map as MapLibreMap } from 'maplibre-gl';
import { rgb } from 'd3-color';
import { interpolateRgb, interpolateNumber } from 'd3-interpolate';
import { cubicInOut } from 'svelte/easing';

export type EasingFunction = (t: number) => number;

/**
 * Valid paint property name accepted by MapLibre GL setPaintProperty / getPaintProperty.
 */
export type PaintPropertyName = Parameters<MapLibreMap['setPaintProperty']>[1];

/**
 * Promise that resolves to true when the tween completes, or false when cancelled.
 */
export interface CancellableTweenPromise extends Promise<boolean> {
  /** Cancels the in-flight tween immediately */
  cancel: () => void;
}

/**
 * Configuration options for animating paint properties on MapLibre layers.
 */
export interface TweenLayerOptions {
  /** MapLibre Map instance containing the layer(s) */
  map: MapLibreMap;
  /** Single layer ID or array of layer IDs to animate */
  layerId: string | string[];
  /** Target paint properties and end values to animate */
  properties: Record<string, number | string>;
  /** Optional starting paint properties override (e.g. { 'raster-opacity': 0 }) */
  startProperties?: Record<string, number | string>;
  /** Duration of the animation in milliseconds (defaults to 300ms) */
  duration?: number;
  /** Easing function (defaults to cubicInOut) */
  easing?: EasingFunction;
}

/**
 * Configuration options for animating feature-state on individual items / shapes.
 */
export interface TweenFeatureStateOptions {
  /** MapLibre Map instance */
  map: MapLibreMap;
  /** GeoJSON source ID containing the target feature(s) */
  source: string;
  /** Single feature ID or array of feature IDs to animate */
  id: string | number | Array<string | number>;
  /** Optional vector tile source layer name */
  sourceLayer?: string;
  /** Target feature states and end values to animate */
  state: Record<string, number | string>;
  /** Optional starting state override (e.g. { fillOpacity: 0 }) */
  startState?: Record<string, number | string>;
  /** Duration of the animation in milliseconds (defaults to 300ms) */
  duration?: number;
  /** Easing function (defaults to cubicInOut) */
  easing?: EasingFunction;
}

interface ActiveLayerPropertyTween {
  layerIds: string[];
  property: PaintPropertyName;
  interpolator: (t: number) => number | string;
  startTime: number;
  duration: number;
  easing: EasingFunction;
  resolve: (completed: boolean) => void;
}

interface ActiveFeatureStateTween {
  source: string;
  ids: Array<string | number>;
  sourceLayer?: string;
  stateKey: string;
  interpolator: (t: number) => number | string;
  startTime: number;
  duration: number;
  easing: EasingFunction;
  resolve: (completed: boolean) => void;
}

/**
 * WeakMap registries keeping active animations isolated per MapLibre map instance.
 */
const mapLayerTweens = new WeakMap<MapLibreMap, Map<string, ActiveLayerPropertyTween>>();
const mapFeatureTweens = new WeakMap<MapLibreMap, Map<string, ActiveFeatureStateTween>>();
const activeMaps = new Set<MapLibreMap>();

let rafHandle: number | null = null;

function getLayerRegistry(map: MapLibreMap): Map<string, ActiveLayerPropertyTween> {
  let registry = mapLayerTweens.get(map);
  if (!registry) {
    registry = new Map<string, ActiveLayerPropertyTween>();
    mapLayerTweens.set(map, registry);
  }
  return registry;
}

function getFeatureRegistry(map: MapLibreMap): Map<string, ActiveFeatureStateTween> {
  let registry = mapFeatureTweens.get(map);
  if (!registry) {
    registry = new Map<string, ActiveFeatureStateTween>();
    mapFeatureTweens.set(map, registry);
  }
  return registry;
}

/**
 * Checks whether a given value is a colour string (hex, rgb, rgba, hsl).
 */
export function isColourValue(val: unknown): boolean {
  if (typeof val !== 'string' || !val.trim()) return false;
  return rgb(val) !== null && !/^-?[\d.]+$/.test(val.trim());
}

/**
 * Creates an interpolator for a numeric or colour value.
 */
function createInterpolator(
  startVal: number | string,
  endVal: number | string
): (t: number) => number | string {
  const isColour = isColourValue(startVal) || isColourValue(endVal);
  if (isColour) {
    return interpolateRgb(String(startVal), String(endVal));
  }
  return interpolateNumber(Number(startVal) || 0, Number(endVal) || 0);
}

/**
 * Resolves a sensible default initial value for a property name if unset.
 */
function getDefaultPropertyValue(property: string, targetVal: number | string): number | string {
  if (isColourValue(targetVal)) {
    return '#000000';
  }
  if (property.toLowerCase().includes('opacity')) {
    return Number(targetVal) === 1 ? 0 : 1;
  }
  return 0;
}

/**
 * Central animation loop executing all active layer and feature-state tweens.
 */
function animationLoop(timestamp: number) {
  if (activeMaps.size === 0) {
    rafHandle = null;
    return;
  }

  const idleMaps: MapLibreMap[] = [];

  activeMaps.forEach(map => {
    const layerRegistry = getLayerRegistry(map);
    const featureRegistry = getFeatureRegistry(map);

    // 1. Process active Layer Paint property tweens
    const finishedLayerKeys: string[] = [];
    layerRegistry.forEach((tween, key) => {
      const elapsed = timestamp - tween.startTime;
      const rawT = tween.duration <= 0 ? 1 : Math.min(1, Math.max(0, elapsed / tween.duration));
      const easedT = tween.easing(rawT);
      const nextValue = tween.interpolator(easedT);

      tween.layerIds.forEach(lid => {
        try {
          if (map.getLayer(lid)) {
            map.setPaintProperty(lid, tween.property, nextValue);
          }
        } catch {
          // Layer or style may be transiently unavailable
        }
      });

      if (rawT >= 1) {
        finishedLayerKeys.push(key);
        tween.resolve(true);
      }
    });
    finishedLayerKeys.forEach(k => layerRegistry.delete(k));

    // 2. Process active Feature-State tweens
    const finishedFeatureKeys: string[] = [];
    featureRegistry.forEach((tween, key) => {
      const elapsed = timestamp - tween.startTime;
      const rawT = tween.duration <= 0 ? 1 : Math.min(1, Math.max(0, elapsed / tween.duration));
      const easedT = tween.easing(rawT);
      const nextValue = tween.interpolator(easedT);

      tween.ids.forEach(id => {
        try {
          map.setFeatureState(
            { source: tween.source, sourceLayer: tween.sourceLayer, id },
            { [tween.stateKey]: nextValue }
          );
        } catch {
          // Source may be transiently unavailable
        }
      });

      if (rawT >= 1) {
        finishedFeatureKeys.push(key);
        tween.resolve(true);
      }
    });
    finishedFeatureKeys.forEach(k => featureRegistry.delete(k));

    if (layerRegistry.size === 0 && featureRegistry.size === 0) {
      idleMaps.push(map);
    }
  });

  idleMaps.forEach(map => activeMaps.delete(map));

  if (activeMaps.size > 0) {
    rafHandle = requestAnimationFrame(animationLoop);
  } else {
    rafHandle = null;
  }
}

function ensureTickerRunning() {
  if (rafHandle === null && typeof requestAnimationFrame !== 'undefined') {
    rafHandle = requestAnimationFrame(animationLoop);
  }
}

/**
 * Tweens paint properties across one or more MapLibre layers.
 *
 * @example
 * ```ts
 * // Fade in a satellite layer from 0 to 1
 * await tweenLayer({
 *   map,
 *   layerId: 'satellite-layer',
 *   startProperties: { 'raster-opacity': 0 },
 *   properties: { 'raster-opacity': 1 },
 *   duration: 400
 * });
 * ```
 */
export function tweenLayer({
  map,
  layerId,
  properties,
  startProperties,
  duration = 300,
  easing = cubicInOut
}: TweenLayerOptions): CancellableTweenPromise {
  const layerIds = Array.isArray(layerId) ? layerId : [layerId];
  const entries = Object.entries(properties);
  const layerRegistry = getLayerRegistry(map);

  if (entries.length === 0 || layerIds.length === 0) {
    const p = Promise.resolve(true) as CancellableTweenPromise;
    p.cancel = () => {};
    return p;
  }

  const registeredKeys: string[] = [];
  const propertyPromises = entries.map(([property, targetValue]) => {
    const paintProperty = property as PaintPropertyName;
    const key = `${layerIds.join(',')}::${property}`;
    registeredKeys.push(key);

    // Cancel existing tween on same layer and property
    const existing = layerRegistry.get(key);
    if (existing) {
      existing.resolve(false);
      layerRegistry.delete(key);
    }

    // Resolve initial start value
    let initialValue: number | string;
    if (startProperties && startProperties[property] !== undefined) {
      initialValue = startProperties[property];
      layerIds.forEach(lid => {
        try {
          if (map.getLayer(lid)) {
            map.setPaintProperty(lid, paintProperty, initialValue);
          }
        } catch {}
      });
    } else {
      const firstLid = layerIds[0];
      const runtimeValue = map.getPaintProperty ? map.getPaintProperty(firstLid, paintProperty) : undefined;
      const initialPaintValue = (map.getLayer(firstLid) as any)?.paint?.[property];
      initialValue = runtimeValue ?? initialPaintValue ?? getDefaultPropertyValue(property, targetValue);
    }

    const interpolator = createInterpolator(initialValue, targetValue);

    let resolvePromise: (completed: boolean) => void = () => {};
    const propPromise = new Promise<boolean>(resolve => {
      resolvePromise = resolve;
    });

    if (duration <= 0) {
      const finalValue = interpolator(1);
      layerIds.forEach(lid => {
        try {
          if (map.getLayer(lid)) {
            map.setPaintProperty(lid, paintProperty, finalValue);
          }
        } catch {}
      });
      resolvePromise(true);
      return propPromise;
    }

    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    layerRegistry.set(key, {
      layerIds,
      property: paintProperty,
      interpolator,
      startTime,
      duration,
      easing,
      resolve: resolvePromise
    });

    return propPromise;
  });

  activeMaps.add(map);
  ensureTickerRunning();

  const promise = Promise.all(propertyPromises).then(results =>
    results.every(Boolean)
  ) as CancellableTweenPromise;

  promise.cancel = () => {
    registeredKeys.forEach(key => {
      const tween = layerRegistry.get(key);
      if (tween) {
        tween.resolve(false);
        layerRegistry.delete(key);
      }
    });

    if (layerRegistry.size === 0 && getFeatureRegistry(map).size === 0) {
      activeMaps.delete(map);
      if (activeMaps.size === 0 && rafHandle !== null) {
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }
    }
  };

  return promise;
}

/**
 * Tweens feature states on individual items (such as custom labels or GeoJSON country shapes).
 *
 * @example
 * ```ts
 * // Highlight a custom label with gold colour
 * await tweenFeatureState({
 *   map,
 *   source: 'custom-labels',
 *   id: ['Australia', 'New Zealand'],
 *   state: { textColor: '#FFCC00', textOpacity: 1 },
 *   duration: 350
 * });
 * ```
 */
export function tweenFeatureState({
  map,
  source,
  id,
  sourceLayer,
  state,
  startState,
  duration = 300,
  easing = cubicInOut
}: TweenFeatureStateOptions): CancellableTweenPromise {
  const ids = Array.isArray(id) ? id : [id];
  const entries = Object.entries(state);
  const featureRegistry = getFeatureRegistry(map);

  if (entries.length === 0 || ids.length === 0) {
    const p = Promise.resolve(true) as CancellableTweenPromise;
    p.cancel = () => {};
    return p;
  }

  const registeredKeys: string[] = [];
  const statePromises = entries.map(([stateKey, targetValue]) => {
    const key = `${source}::${sourceLayer || ''}::${ids.join(',')}::${stateKey}`;
    registeredKeys.push(key);

    // Cancel existing tween on same target and state key
    const existing = featureRegistry.get(key);
    if (existing) {
      existing.resolve(false);
      featureRegistry.delete(key);
    }

    // Resolve initial start value
    let initialValue: number | string;
    if (startState && startState[stateKey] !== undefined) {
      initialValue = startState[stateKey];
      ids.forEach(fid => {
        try {
          map.setFeatureState(
            { source, sourceLayer, id: fid },
            { [stateKey]: initialValue }
          );
        } catch {}
      });
    } else {
      const firstId = ids[0];
      const currentFeatureState = map.getFeatureState
        ? map.getFeatureState({ source, sourceLayer, id: firstId })
        : undefined;
      const runtimeVal = currentFeatureState ? currentFeatureState[stateKey] : undefined;
      initialValue = runtimeVal !== undefined ? runtimeVal : getDefaultPropertyValue(stateKey, targetValue);
    }

    const interpolator = createInterpolator(initialValue, targetValue);

    let resolvePromise: (completed: boolean) => void = () => {};
    const statePromise = new Promise<boolean>(resolve => {
      resolvePromise = resolve;
    });

    if (duration <= 0) {
      const finalValue = interpolator(1);
      ids.forEach(fid => {
        try {
          map.setFeatureState(
            { source, sourceLayer, id: fid },
            { [stateKey]: finalValue }
          );
        } catch {}
      });
      resolvePromise(true);
      return statePromise;
    }

    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    featureRegistry.set(key, {
      source,
      ids,
      sourceLayer,
      stateKey,
      interpolator,
      startTime,
      duration,
      easing,
      resolve: resolvePromise
    });

    return statePromise;
  });

  activeMaps.add(map);
  ensureTickerRunning();

  const promise = Promise.all(statePromises).then(results =>
    results.every(Boolean)
  ) as CancellableTweenPromise;

  promise.cancel = () => {
    registeredKeys.forEach(key => {
      const tween = featureRegistry.get(key);
      if (tween) {
        tween.resolve(false);
        featureRegistry.delete(key);
      }
    });

    if (getLayerRegistry(map).size === 0 && featureRegistry.size === 0) {
      activeMaps.delete(map);
      if (activeMaps.size === 0 && rafHandle !== null) {
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }
    }
  };

  return promise;
}

/**
 * Cancels active layer paint tweens for a map.
 */
export function cancelLayerTweens(map: MapLibreMap, layerId?: string, property?: string): void {
  const layerRegistry = mapLayerTweens.get(map);
  if (!layerRegistry) return;

  for (const [key, tween] of layerRegistry.entries()) {
    const matchesLayer = !layerId || tween.layerIds.includes(layerId);
    const matchesProp = !property || tween.property === property;
    if (matchesLayer && matchesProp) {
      tween.resolve(false);
      layerRegistry.delete(key);
    }
  }

  if (layerRegistry.size === 0 && (!mapFeatureTweens.get(map) || mapFeatureTweens.get(map)!.size === 0)) {
    activeMaps.delete(map);
    if (activeMaps.size === 0 && rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
  }
}

/**
 * Cancels active feature-state tweens for a map.
 */
export function cancelFeatureStateTweens(
  map: MapLibreMap,
  source?: string,
  id?: string | number,
  stateKey?: string
): void {
  const featureRegistry = mapFeatureTweens.get(map);
  if (!featureRegistry) return;

  for (const [key, tween] of featureRegistry.entries()) {
    const matchesSource = !source || tween.source === source;
    const matchesId = id === undefined || tween.ids.includes(id);
    const matchesKey = !stateKey || tween.stateKey === stateKey;

    if (matchesSource && matchesId && matchesKey) {
      tween.resolve(false);
      featureRegistry.delete(key);
    }
  }

  if (featureRegistry.size === 0 && (!mapLayerTweens.get(map) || mapLayerTweens.get(map)!.size === 0)) {
    activeMaps.delete(map);
    if (activeMaps.size === 0 && rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
  }
}

/**
 * Cancels all active animations across all maps (or for a specific map).
 */
export function cancelAllTweens(targetMap?: MapLibreMap): void {
  const mapsToClear = targetMap ? [targetMap] : Array.from(activeMaps);

  mapsToClear.forEach(map => {
    const layerRegistry = mapLayerTweens.get(map);
    if (layerRegistry) {
      layerRegistry.forEach(t => t.resolve(false));
      layerRegistry.clear();
    }

    const featureRegistry = mapFeatureTweens.get(map);
    if (featureRegistry) {
      featureRegistry.forEach(t => t.resolve(false));
      featureRegistry.clear();
    }

    activeMaps.delete(map);
  });

  if (activeMaps.size === 0 && rafHandle !== null) {
    cancelAnimationFrame(rafHandle);
    rafHandle = null;
  }
}

/**
 * Returns the count of active tweens for a given map (or globally).
 */
export function getActiveTweenCount(targetMap?: MapLibreMap): number {
  if (targetMap) {
    const l = mapLayerTweens.get(targetMap)?.size || 0;
    const f = mapFeatureTweens.get(targetMap)?.size || 0;
    return l + f;
  }
  let total = 0;
  activeMaps.forEach(map => {
    total += (mapLayerTweens.get(map)?.size || 0) + (mapFeatureTweens.get(map)?.size || 0);
  });
  return total;
}
