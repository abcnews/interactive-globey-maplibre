<script lang="ts">
  import type * as maplibregl from 'maplibre-gl';
  import { getContext } from 'svelte';

  let { projection = 'globe' }: { projection?: 'globe' | 'mercator' } = $props();

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    const currentProjection = projection;

    const applyProjection = () => {
      map.setProjection({
        type: currentProjection
      });
    };

    if (map.isStyleLoaded()) {
      applyProjection();
    } else {
      map.once('styledata', applyProjection);
      return () => map.off('styledata', applyProjection);
    }
  });
</script>
