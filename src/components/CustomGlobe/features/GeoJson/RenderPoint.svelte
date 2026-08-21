<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { Map, GeoJSONSource } from 'maplibre-gl';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import {
    getColourExpression,
    getCircleRadiusExpression,
    getCircleOpacityExpression,
    getStrokeWidthExpression,
    getStrokeOpacityExpression
  } from './utils';
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

  /**
   * Applies paint properties for circle styling from the current config.
   */
  function updateStyles() {
    const map = mapRoot.map;
    const lid = layerId;
    if (map && map.getLayer(lid)) {
      map.setPaintProperty(lid, 'circle-color', getColourExpression(config, 'marker'));
      map.setPaintProperty(lid, 'circle-radius', getCircleRadiusExpression(config));
      map.setPaintProperty(lid, 'circle-opacity', getCircleOpacityExpression(config));
      map.setPaintProperty(lid, 'circle-stroke-width', getStrokeWidthExpression(config));
      map.setPaintProperty(lid, 'circle-stroke-color', getColourExpression(config, 'stroke'));
      map.setPaintProperty(lid, 'circle-stroke-opacity', getStrokeOpacityExpression(config));
    }
  }

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
              'circle-color-transition': { duration: 300 },
              'circle-radius-transition': { duration: 300 },
              'circle-opacity-transition': { duration: 300 },
              'circle-stroke-color-transition': { duration: 300 },
              'circle-stroke-opacity-transition': { duration: 300 }
            }
          },
          targetZ
        );
        updateStyles();
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
    }
  });

  // Update Styles
  $effect(() => {
    config;
    updateStyles();
  });
</script>
