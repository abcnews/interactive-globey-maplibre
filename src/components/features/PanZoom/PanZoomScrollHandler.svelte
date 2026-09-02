<script lang="ts">
  import type * as maplibregl from 'maplibre-gl';
  import { getContext, untrack } from 'svelte';
  import { disableMapAnimation, prefersReducedMotion } from '../../../lib/stores';
  import type { PanZoomScrollProps } from './types';
  import { resolveAllPanelViews, createZoomInterpolator } from './utils';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const { panels, currentPanel = 0, virtualPanel = 0, panelPct = 0, scrollDelta = 0 }: PanZoomScrollProps = $props();

  let isReducedMotionActive = $derived($prefersReducedMotion || $disableMapAnimation);
  let containerDimensions = $state({ width: 0, height: 0 });

  // Observe map container dimensions reactively
  $effect(() => {
    const map = mapRoot.map;
    if (!map) return;

    const container = map.getContainer();
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        containerDimensions = {
          width: entry.contentRect.width,
          height: entry.contentRect.height
        };
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  });

  // Reactive view resolution pipeline
  let views = $derived.by(() => {
    const map = mapRoot.map;
    if (!map) return [];
    containerDimensions; // Re-evaluate when container size changes
    return resolveAllPanelViews(map, panels);
  });

  /** Mouse wheel property tween */
  const WHEEL_TWEEN = { duration: 350, easing: cubicOut };

  // Directly index start and target views using pre-clamped currentPanel
  let startView = $derived(views[currentPanel]);
  let targetView = $derived(virtualPanel < 0 ? startView : (views[currentPanel + 1] ?? startView));

  let interpolator = $derived(startView && targetView ? createZoomInterpolator(startView, targetView) : null);

  // Tweened camera state
  const zoomTween = new Tween(untrack(() => startView?.zoom ?? 0));
  const lngTween = new Tween(untrack(() => startView?.center[0] ?? 0));
  const latTween = new Tween(untrack(() => startView?.center[1] ?? 0));

  $effect(() => {
    if (!startView) return;

    const target =
      isReducedMotionActive || startView === targetView || panelPct === 0 || !interpolator
        ? { center: startView.center, zoom: startView.zoom }
        : interpolator(panelPct);

    /** touch decives like phones/tablets, excluding devices like Windows touchscreens */
    const isTouchDevice = window.matchMedia('(pointer: coarse) and (hover: none)').matches;
    const isWheel = !isReducedMotionActive && !isTouchDevice;
    const opts = isWheel ? WHEEL_TWEEN : { duration: 0 };

    zoomTween.set(target.zoom, opts);
    lngTween.set(target.center[0], opts);
    latTween.set(target.center[1], opts);
  });

  // Apply camera position to map
  $effect(() => {
    const map = mapRoot.map;
    if (!map) return;

    map.jumpTo({
      center: [lngTween.current, latTween.current],
      zoom: zoomTween.current
    });
  });
</script>
