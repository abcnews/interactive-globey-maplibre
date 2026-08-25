<script lang="ts">
  import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
  import { getContext, untrack } from 'svelte';
  import type { Label } from '../../../lib/marker';
  import {
    addLayerWithZIndex,
    setLayerZIndex,
    removeLayerWithZIndex,
    Z_INDEX_CUSTOM_LABELS
  } from '../layers/layerUtils.ts';
  import { getCustomLabelLayers } from '../../CustomGlobe/mapStyle/customLabelStyle';

  const SOURCE_ID = 'custom-labels';

  interface Props {
    /** Array of custom user labels to render */
    labels?: Label[];
    /** Virtual Z-Index layer order for stacking */
    zIndex?: number;
    /** Whether the current map style is in dark/satellite mode */
    isDark?: boolean;
  }

  let { labels = [], zIndex, isDark = false }: Props = $props();

  const mapRoot = getContext<{ map: MapLibreMap | null }>('mapInstance');

  const labelsJson = $derived(JSON.stringify(labels));
  const activeZIndex = $derived(zIndex ?? Z_INDEX_CUSTOM_LABELS);

  // 1. Initialise Layer & Source once, and clean up only on component unmount
  $effect(() => {
    if (!mapRoot?.map || typeof window === 'undefined') return;
    const map = mapRoot.map;
    const layers = getCustomLabelLayers(isDark, SOURCE_ID);

    untrack(() => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
      }

      layers.forEach(layer => {
        if (!map.getLayer(layer.id)) {
          addLayerWithZIndex(map, layer, activeZIndex);
        }
      });
    });

    return () => {
      layers.forEach(layer => {
        removeLayerWithZIndex(map, layer.id);
      });
      if (map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID);
      }
    };
  });

  // 2. Purely update GeoJSON data when labels change
  $effect(() => {
    labelsJson;

    if (!mapRoot?.map || typeof window === 'undefined') return;
    const map = mapRoot.map;

    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;

    const geoJsonData: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: (labels || [])
        .filter(label => Boolean(label?.coords && label?.name))
        .map((label, index) => ({
          type: 'Feature',
          id: index,
          properties: {
            name: label.name,
            style: label.style
          },
          geometry: {
            type: 'Point',
            coordinates: label.coords
          }
        }))
    };

    source.setData(geoJsonData);
  });

  // 3. Update paint properties seamlessly when isDark changes
  $effect(() => {
    isDark;

    if (!mapRoot?.map || typeof window === 'undefined') return;
    const map = mapRoot.map;
    const layers = getCustomLabelLayers(isDark, SOURCE_ID);

    layers.forEach(layer => {
      if (map.getLayer(layer.id) && layer.paint) {
        if (layer.paint['text-color']) {
          map.setPaintProperty(layer.id, 'text-color', layer.paint['text-color']);
        }
        if (layer.paint['text-halo-color']) {
          map.setPaintProperty(layer.id, 'text-halo-color', layer.paint['text-halo-color']);
        }
      }
    });
  });

  // 4. Dynamically restack layers if activeZIndex changes
  $effect(() => {
    if (!mapRoot?.map || typeof window === 'undefined') return;
    const map = mapRoot.map;
    const layers = getCustomLabelLayers(isDark, SOURCE_ID);

    layers.forEach(layer => {
      if (map.getLayer(layer.id)) {
        setLayerZIndex(map, layer.id, activeZIndex);
      }
    });
  });
</script>
