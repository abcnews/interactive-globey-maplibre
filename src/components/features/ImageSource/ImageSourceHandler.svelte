<script lang="ts">
  import type { ImageSourceConfig } from '../../../lib/marker';
  import type * as maplibregl from 'maplibre-gl';
  import { getContext, untrack } from 'svelte';
  import {
    addLayerWithZIndex,
    removeLayerWithZIndex,
    setLayerZIndex,
    Z_INDEX_IMAGE_LAYERS
  } from '../layers/layerUtils.ts';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  let {
    config,
    zIndex = config.zIndex ?? Z_INDEX_IMAGE_LAYERS
  }: {
    config: ImageSourceConfig;
    zIndex?: number;
  } = $props();

  // Stabilize essential IDs and URLs.
  const currentSid = $derived(`image-source-${config.id || config.url}`);
  const currentLid = $derived(`image-layer-${config.id || config.url}`);
  const currentUrl = $derived(config.url);

  // LIFECYCLE EFFECT: Only manages adding/removing the source/layer from the map.
  $effect(() => {
    const map = mapRoot.map;

    if (!map || !currentUrl) return;

    const setup = () => {
      if (!map.getStyle() || map.getSource(currentSid)) return;

      try {
        const initialCoords = untrack(() => config.coordinates) || [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0]
        ];
        const initialOpacity = untrack(() => config.opacity) ?? 1;
        const currentZIndex = untrack(() => zIndex);

        map.addSource(currentSid, {
          type: 'image',
          url: currentUrl,
          coordinates: initialCoords as any
        });

        addLayerWithZIndex(
          map,
          {
            id: currentLid,
            type: 'raster',
            source: currentSid,
            paint: { 'raster-opacity': initialOpacity }
          },
          currentZIndex
        );
      } catch (e) {
        // Failing to add source/layer is expected during style transitions
      }
    };

    setup();
    map.on('styledata', setup);
    map.on('load', setup);

    return () => {
      map.off('styledata', setup);
      map.off('load', setup);

      removeLayerWithZIndex(map, currentLid);
      if (map.getSource(currentSid)) map.removeSource(currentSid);
    };
  });

  // OPACITY EFFECT: Updates opacity in-place.
  $effect(() => {
    const map = mapRoot.map;
    const currentOpacity = config.opacity;
    if (!map || !map.getLayer(currentLid)) return;

    map.setPaintProperty(currentLid, 'raster-opacity', currentOpacity);
  });

  // COORDINATES EFFECT: Updates coordinates in-place.
  $effect(() => {
    const map = mapRoot.map;
    const currentCoords = config.coordinates;
    if (!map || !map.getSource(currentSid)) return;

    const source = map.getSource(currentSid) as any;
    if (source && source.setCoordinates && currentCoords?.length === 4) {
      source.setCoordinates(currentCoords);
    }
  });

  // Z-INDEX STACKING EFFECT: Updates layer stacking position when zIndex changes.
  $effect(() => {
    const map = mapRoot.map;
    const targetZ = zIndex ?? config.zIndex;
    if (!map || !map.getLayer(currentLid) || targetZ === undefined) return;

    setLayerZIndex(map, currentLid, targetZ);
  });
</script>
