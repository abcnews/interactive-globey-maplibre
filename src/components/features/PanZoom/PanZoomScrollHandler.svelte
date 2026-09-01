<script lang="ts">
  import type * as maplibregl from 'maplibre-gl';
  import { getContext } from 'svelte';
  import { disableMapAnimation, prefersReducedMotion } from '../../../lib/stores';
  import type { PanZoomScrollProps } from './types';
  import { resolveAllPanelViews, createZoomInterpolator } from './utils';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const { panels, currentPanel = 0, virtualPanel = 0, panelPct = 0 }: PanZoomScrollProps = $props();

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

  // Directly index start and target views using pre-clamped currentPanel
  let startView = $derived(views[currentPanel]);
  let targetView = $derived(virtualPanel < 0 ? startView : (views[currentPanel + 1] ?? startView));

  // Cached per transition segment — not rebuilt on every scroll frame
  let interpolator = $derived(startView && targetView ? createZoomInterpolator(startView, targetView) : null);

  // Apply camera position to map
  $effect(() => {
    const map = mapRoot.map;
    if (!map || !startView) return;

    if (isReducedMotionActive || startView === targetView || panelPct === 0 || !interpolator) {
      map.jumpTo({
        center: startView.center,
        zoom: startView.zoom,
        essential: true
      });
      return;
    }

    const interpolated = interpolator(panelPct);
    map.jumpTo({
      center: interpolated.center,
      zoom: interpolated.zoom,
      essential: true
    });
  });
</script>
