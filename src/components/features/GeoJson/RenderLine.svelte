<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { Map, GeoJSONSource } from 'maplibre-gl';
  import type { GeoJsonConfig } from '../../../lib/marker';
  import { applyFeatureStates, getKilometreZoomScaleExpression } from './utils.ts';
  import {
    addLayerWithZIndex,
    removeLayerWithZIndex,
    Z_INDEX_GEOJSON,
    SUB_LAYER_OUTLINE_OFFSET
  } from '../layers/layerUtils.ts';

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

  const layerId = $derived(`${sourceId}-line`);
  const outlineLayerId = $derived(`${sourceId}-line-outline`);

  // Layer lifecycle: add/remove layer only on mount, unmount, and when map, sourceId, or zIndex changes
  $effect(() => {
    const map = mapRoot.map;
    const sid = sourceId;
    const lid = layerId;
    const olid = outlineLayerId;
    const targetZ = zIndex;

    if (!map) return;

    untrack(() => {
      // Initialize Source
      if (!map.getSource(sid)) {
        map.addSource(sid, {
          type: 'geojson',
          data: data || { type: 'FeatureCollection', features: [] }
        });
      }

      // Initialize Outline Layer (placed slightly below main stroke)
      if (map.getSource(sid) && !map.getLayer(olid)) {
        addLayerWithZIndex(
          map,
          {
            id: olid,
            type: 'line',
            source: sid,
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': ['coalesce', ['feature-state', 'outlineColor'], '#ffffff'],
              'line-width': ['coalesce', ['feature-state', 'outlineWidth'], 4],
              'line-opacity': ['coalesce', ['feature-state', 'strokeOpacity'], 1],
              'line-width-transition': { duration: 300 },
              'line-opacity-transition': { duration: 300 },
              'line-color-transition': { duration: 300 }
            }
          },
          targetZ - SUB_LAYER_OUTLINE_OFFSET
        );
      }

      // Initialize Main Line Layer
      if (map.getSource(sid) && !map.getLayer(lid)) {
        addLayerWithZIndex(
          map,
          {
            id: lid,
            type: 'line',
            source: sid,
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': ['coalesce', ['feature-state', 'strokeColor'], '#00267e'],
              'line-width':
                config.lineWidth?.unit === 'k'
                  ? getKilometreZoomScaleExpression(config.lineWidth.value)
                  : ['coalesce', ['feature-state', 'strokeWidth'], 2],
              'line-opacity': ['coalesce', ['feature-state', 'strokeOpacity'], 1],
              'line-color-transition': { duration: 300 },
              'line-opacity-transition': { duration: 300 },
              'line-width-transition': { duration: 300 }
            }
          },
          targetZ
        );
      }

      applyFeatureStates(map, sid, data, config);
    });

    return () => {
      removeLayerWithZIndex(map, lid);
      removeLayerWithZIndex(map, olid);
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

  // Update Styles on config change
  $effect(() => {
    const map = mapRoot.map;
    const sid = sourceId;
    config;
    if (map && map.getSource(sid) && data) {
      applyFeatureStates(map, sid, data, config);
    }
  });
</script>
