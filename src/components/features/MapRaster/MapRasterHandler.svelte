<script lang="ts">
  import type * as maplibregl from 'maplibre-gl';
  import { getContext, untrack } from 'svelte';
  import {
    addLayerWithZIndex,
    removeLayerWithZIndex,
    setLayerZIndex,
    Z_INDEX_BASE_RASTER
  } from '../layers/layerUtils.ts';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let {
    url,
    attribution,
    id = 'raster-base',
    maxZoom = 7,
    tileSize = 256,
    zIndex = Z_INDEX_BASE_RASTER
  }: {
    url: string;
    attribution?: string;
    id?: string;
    maxZoom?: number;
    tileSize?: number;
    zIndex?: number;
  } = $props();

  // Effect for source and layer lifecycle
  $effect(() => {
    const map = mapRoot.map;
    if (!map || !url) {
      return;
    }

    const sourceId = `${id}-source`;
    const s_url = url;
    const s_attribution = attribution;
    const s_maxZoom = maxZoom;
    const s_tileSize = tileSize;

    const setup = () => {
      if (!map.getStyle() || map.getSource(sourceId)) return;

      try {
        map.addSource(sourceId, {
          type: 'raster',
          tiles: [s_url],
          tileSize: s_tileSize,
          attribution: s_attribution,
          maxzoom: s_maxZoom
        });

        const initialZ = untrack(() => zIndex ?? Z_INDEX_BASE_RASTER);
        addLayerWithZIndex(
          map,
          {
            id,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-fade-duration': 0
            }
          },
          initialZ
        );
      } catch (e) {
        // Handled during style loads
      }
    };

    setup();
    map.on('styledata', setup);
    map.on('load', setup);

    return () => {
      map.off('styledata', setup);
      map.off('load', setup);
      removeLayerWithZIndex(map, id);
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  });

  // Effect for dynamic z-index updates
  $effect(() => {
    const map = mapRoot.map;
    const targetZ = zIndex;
    if (!map || !map.getLayer(id) || targetZ === undefined) return;

    setLayerZIndex(map, id, targetZ);
  });
</script>
