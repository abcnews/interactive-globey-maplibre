<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { Map, GeoJSONSource } from 'maplibre-gl';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { applyFeatureStates, getKilometreZoomScaleExpression } from './utils';
  import { addLayerWithZIndex, removeLayerWithZIndex, Z_INDEX_GEOJSON } from '../layerUtils';

  const mapRoot = getContext<{ map: Map }>('mapInstance');

  let {
    data,
    config,
    sourceId,
    zIndex = config.zIndex ?? Z_INDEX_GEOJSON
  }: {
    data: any;
    config: GeoJsonConfig;
    sourceId: string;
    zIndex?: number;
  } = $props();

  const layerId = $derived(`${sourceId}-circle`);

  // Layer lifecycle: add/remove layer only on mount, unmount, and when map, sourceId, or zIndex changes
  $effect(() => {
    const map = mapRoot.map;
    const sid = sourceId;
    const lid = layerId;
    const targetZ = zIndex;

    if (!map) return;

    untrack(() => {
      // Add source if it doesn't exist
      if (!map.getSource(sid)) {
        map.addSource(sid, {
          type: 'geojson',
          data: data || { type: 'FeatureCollection', features: [] }
        });
      }

      // Add layer if source exists and layer doesn't
      if (map.getSource(sid) && !map.getLayer(lid)) {
        addLayerWithZIndex(
          map,
          {
            id: lid,
            type: 'circle',
            source: sid,
            paint: {
              'circle-pitch-scale': 'map',
              'circle-color': ['coalesce', ['feature-state', 'color'], '#00267e'],
              'circle-radius':
                config.pointSize?.unit === 'k'
                  ? getKilometreZoomScaleExpression(config.pointSize.value)
                  : ['coalesce', ['feature-state', 'radius'], 6],
              'circle-opacity': ['coalesce', ['feature-state', 'opacity'], 1],
              'circle-stroke-color': ['coalesce', ['feature-state', 'strokeColor'], '#ffffff'],
              'circle-stroke-width': ['coalesce', ['feature-state', 'strokeWidth'], 0],
              'circle-stroke-opacity': ['coalesce', ['feature-state', 'strokeOpacity'], 1],
              'circle-color-transition': { duration: 300 },
              'circle-radius-transition': { duration: 300 },
              'circle-opacity-transition': { duration: 300 },
              'circle-stroke-color-transition': { duration: 300 },
              'circle-stroke-width-transition': { duration: 300 },
              'circle-stroke-opacity-transition': { duration: 300 }
            }
          },
          targetZ
        );

        applyFeatureStates(map, sid, data, config);
      }
    });

    return () => {
      removeLayerWithZIndex(map, lid);
      if (map.getSource(sid)) map.removeSource(sid);
    };
  });

  // Update Data
  $effect(() => {
    const map = mapRoot.map;
    const sid = sourceId;
    if (map && map.getSource(sid) && data) {
      (map.getSource(sid) as GeoJSONSource).setData(data);
      applyFeatureStates(map, sid, data, config);
    }
  });

  // Update Styles on config changes
  $effect(() => {
    const map = mapRoot.map;
    const sid = sourceId;
    config;
    if (map && map.getSource(sid) && data) {
      applyFeatureStates(map, sid, data, config);
    }
  });
</script>
