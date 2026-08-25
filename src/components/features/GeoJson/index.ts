import type { LayerFeatureDefinition, LayerItemDescriptor } from '../types.ts';
import type { GeoJsonConfig, DecodedObject } from '../../../lib/marker';
import { Z_INDEX_GEOJSON } from '../layers/layerUtils.ts';
import { Map as MapIcon } from 'svelte-bootstrap-icons';
import { createEditButton, createDeleteButton } from '../buttonHelpers.ts';
import BuilderGeoJsonConfigModal from './BuilderGeoJsonConfigModal.svelte';
import GeoJsonHandler from './GeoJsonHandler.svelte';

export const geoJsonFeature: LayerFeatureDefinition<GeoJsonConfig> = {
  kind: 'geojson',
  label: 'GeoJSON',
  icon: MapIcon,
  defaultZIndex: Z_INDEX_GEOJSON,
  isMultiItem: true,

  buttons: [
    createEditButton<GeoJsonConfig>({ title: 'Edit GeoJSON layer' }),
    createDeleteButton<GeoJsonConfig>({ title: 'Delete GeoJSON layer' })
  ],

  createDefault({ maxZIndex }) {
    return {
      id: Date.now().toString(),
      type: 'areas',
      colourMode: 'simple',
      zIndex: maxZIndex
    } as any;
  },

  getItems(options: DecodedObject): LayerItemDescriptor<GeoJsonConfig>[] {
    return (options.geoJson || []).map((item, idx) => {
      const typeStr = item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'GeoJSON';
      return {
        id: `geojson-${item.id || item.cmid || idx}`,
        kind: 'geojson',
        name: typeStr,
        description: item.cmid ? `CMID: ${item.cmid}` : 'No CMID',
        zIndex: item.zIndex ?? Z_INDEX_GEOJSON + idx * 0.1,
        data: item
      };
    });
  },

  setZIndex(options: DecodedObject, item: LayerItemDescriptor<GeoJsonConfig>, newZIndex: number) {
    if (item.data) {
      item.data.zIndex = newZIndex;
    }
  },

  add(options: DecodedObject, item: GeoJsonConfig) {
    options.geoJson = [...(options.geoJson || []), item];
  },

  delete(options: DecodedObject, item: LayerItemDescriptor<GeoJsonConfig>) {
    options.geoJson = (options.geoJson || []).filter(entry => entry !== item.data);
  },

  ConfigModal: BuilderGeoJsonConfigModal,
  MapRenderer: GeoJsonHandler
};

export * from './utils.ts';
export * from './themes.ts';
export { default as GeoJsonHandler } from './GeoJsonHandler.svelte';
export { default as BuilderGeoJsonConfigModal } from './BuilderGeoJsonConfigModal.svelte';
