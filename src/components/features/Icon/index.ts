import type { LayerFeatureDefinition, LayerItemDescriptor } from '../types.ts';
import type { IconConfig, DecodedObject } from '../../../lib/marker';
import { Z_INDEX_CUSTOM_LABELS } from '../layers/layerUtils.ts';
import { Image as ImageIcon } from 'svelte-bootstrap-icons';
import BuilderIconConfigModal from './BuilderIconConfigModal.svelte';
import IconsHandler from './IconsHandler.svelte';

export const iconFeature: LayerFeatureDefinition<IconConfig> = {
  kind: 'icon',
  label: 'Icon Marker',
  icon: ImageIcon,
  defaultZIndex: Z_INDEX_CUSTOM_LABELS,
  isMultiItem: true,

  createDefault({ maxZIndex, map }) {
    const center = map?.getCenter() || { lng: 133.7751, lat: -25.2744 };
    return {
      id: Date.now().toString(),
      cmid: 0,
      coords: [center.lng, center.lat],
      zIndex: maxZIndex
    };
  },

  interactivePlacement: {
    prompt: 'Click on the map to place the icon marker',
    onMapClick: (coords, item) => {
      item.coords = coords;
    }
  },

  getItems(options: DecodedObject): LayerItemDescriptor<IconConfig>[] {
    return (options.icons || []).map((item, idx) => {
      return {
        id: `icon-${item.id || item.cmid || idx}`,
        kind: 'icon',
        name: 'Icon Marker',
        description: item.cmid ? `CMID: ${item.cmid}` : 'No CMID',
        zIndex: item.zIndex ?? Z_INDEX_CUSTOM_LABELS + idx * 0.1,
        data: item
      };
    });
  },

  setZIndex(options: DecodedObject, item: LayerItemDescriptor<IconConfig>, newZIndex: number) {
    if (item.data) {
      item.data.zIndex = newZIndex;
    }
  },

  add(options: DecodedObject, item: IconConfig) {
    options.icons = [...(options.icons || []), item];
  },

  delete(options: DecodedObject, item: LayerItemDescriptor<IconConfig>) {
    options.icons = (options.icons || []).filter(entry => entry !== item.data);
  },

  ConfigModal: BuilderIconConfigModal,
  MapRenderer: IconsHandler
};

export { default as IconHandler } from './IconHandler.svelte';
export { default as IconsHandler } from './IconsHandler.svelte';
export { default as BuilderIconConfigModal } from './BuilderIconConfigModal.svelte';
