<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { Map, GeoJSONSource } from 'maplibre-gl';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import {
    getColourExpression,
    getFillOpacityExpression,
    getStrokeOpacityExpression,
    getStrokeWidthExpression
  } from './utils';
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

  const layerId = $derived(`${sourceId}-fill`);
  const outlineLayerId = $derived(`${sourceId}-outline`);

  /**
   * Applies paint properties for fill and outline styling from the current config.
   */
  function updateStyles() {
    const map = mapRoot.map;
    const lid = layerId;
    const olid = outlineLayerId;

    if (map && map.getLayer(lid)) {
      map.setPaintProperty(lid, 'fill-color', getColourExpression(config, 'fill'));
      map.setPaintProperty(lid, 'fill-opacity', getFillOpacityExpression(config));
    }
    if (map && map.getLayer(olid)) {
      map.setPaintProperty(olid, 'line-color', getColourExpression(config, 'stroke'));
      map.setPaintProperty(olid, 'line-width', getStrokeWidthExpression(config));
      map.setPaintProperty(olid, 'line-opacity', getStrokeOpacityExpression(config));
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

      // Initialize Layers
      if (map.getSource(sid)) {
        // Fill layer sits slightly below the stroke outline
        if (!map.getLayer(lid)) {
          addLayerWithZIndex(
            map,
            {
              id: lid,
              type: 'fill',
              source: sid,
              paint: {
                'fill-color-transition': { duration: 300 },
                'fill-opacity-transition': { duration: 300 }
              }
            },
            targetZ - SUB_LAYER_OUTLINE_OFFSET
          );
        }

        if (!map.getLayer(olid)) {
          addLayerWithZIndex(
            map,
            {
              id: olid,
              type: 'line',
              source: sid,
              paint: {
                'line-width-transition': { duration: 300 },
                'line-color-transition': { duration: 300 },
                'line-opacity-transition': { duration: 300 }
              }
            },
            targetZ
          );
        }

        updateStyles();
      }
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
