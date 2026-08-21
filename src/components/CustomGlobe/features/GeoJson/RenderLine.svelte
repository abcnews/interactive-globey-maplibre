<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { Map, GeoJSONSource } from 'maplibre-gl';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { getColourExpression, getStrokeOpacityExpression, getStrokeWidthExpression } from './utils';
  import {
    addLayerWithZIndex,
    removeLayerWithZIndex,
    Z_INDEX_GEOJSON,
    SUB_LAYER_OUTLINE_OFFSET
  } from '../layerUtils';

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

  /**
   * Applies paint properties for main stroke and outline styling from the current config.
   */
  function updateStyles() {
    const map = mapRoot.map;
    const lid = layerId;
    const olid = outlineLayerId;

    if (map) {
      if (map.getLayer(olid)) {
        map.setPaintProperty(olid, 'line-opacity', getStrokeOpacityExpression(config));
        map.setPaintProperty(olid, 'line-width', ['+', getStrokeWidthExpression(config), 2]);
      }
      if (map.getLayer(lid)) {
        map.setPaintProperty(lid, 'line-color', getColourExpression(config, 'stroke'));
        map.setPaintProperty(lid, 'line-opacity', getStrokeOpacityExpression(config));
        map.setPaintProperty(lid, 'line-width', getStrokeWidthExpression(config));
      }
    }
  }

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
              'line-color': '#ffffff'
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
              'line-color-transition': { duration: 300 },
              'line-opacity-transition': { duration: 300 }
            }
          },
          targetZ
        );
      }

      updateStyles();
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
    }
  });

  // Update Styles
  $effect(() => {
    config;
    updateStyles();
  });
</script>
