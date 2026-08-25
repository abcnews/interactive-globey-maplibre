import type { LayerFeatureDefinition, LayerItemDescriptor } from '../types.ts';
import type { DecodedObject } from '../../../lib/marker';
import { hasMapLabels, DEFAULT_MAP_LABELS, DISABLED_MAP_LABELS } from '../../../lib/marker/utils';
import { Z_INDEX_BASE_LABELS } from '../layers/layerUtils.ts';
import { Tag as LabelIcon } from 'svelte-bootstrap-icons';

export const mapLabelsFeature: LayerFeatureDefinition<void> = {
  kind: 'mapLabels',
  label: 'Map Labels',
  icon: LabelIcon,
  defaultZIndex: Z_INDEX_BASE_LABELS,
  isMultiItem: false,

  canAdd(options: DecodedObject) {
    return !hasMapLabels(options.mapLabels);
  },

  createDefault() {},

  getItems(options: DecodedObject): LayerItemDescriptor<void>[] {
    if (!hasMapLabels(options.mapLabels)) return [];
    return [
      {
        id: 'map-labels',
        kind: 'mapLabels',
        name: 'Map Labels',
        description: 'Built-in Country and City Names',
        zIndex: options.mapLabelsZIndex ?? Z_INDEX_BASE_LABELS
      }
    ];
  },

  setZIndex(options: DecodedObject, _item: LayerItemDescriptor<void>, newZIndex: number) {
    options.mapLabelsZIndex = newZIndex;
  },

  add(options: DecodedObject) {
    options.mapLabels = { ...DEFAULT_MAP_LABELS };
  },

  delete(options: DecodedObject) {
    options.mapLabels = { ...DISABLED_MAP_LABELS };
  }
};
