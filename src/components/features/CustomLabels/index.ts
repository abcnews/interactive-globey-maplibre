import type { LayerFeatureDefinition, LayerItemDescriptor } from '../types.ts';
import type { Label, DecodedObject } from '../../../lib/marker';
import { Z_INDEX_CUSTOM_LABELS } from '../layers/layerUtils.ts';
import { Fonts as TypeIcon } from 'svelte-bootstrap-icons';
import MapCustomLabelHandler from './MapCustomLabelHandler.svelte';

export const customLabelsFeature: LayerFeatureDefinition<Label[]> = {
  kind: 'customLabels',
  label: 'Custom Labels',
  icon: TypeIcon,
  defaultZIndex: Z_INDEX_CUSTOM_LABELS,
  isMultiItem: false,

  canAdd(options: DecodedObject) {
    return !options.labels || options.labels.length === 0;
  },

  createDefault() {
    return [];
  },

  getItems(options: DecodedObject): LayerItemDescriptor<Label[]>[] {
    if (!options.labels || options.labels.length === 0) return [];
    return [
      {
        id: 'custom-labels',
        kind: 'customLabels',
        name: 'Custom Labels',
        description: `${options.labels.length} placed label${options.labels.length === 1 ? '' : 's'}`,
        zIndex: options.labelsZIndex ?? Z_INDEX_CUSTOM_LABELS,
        data: options.labels
      }
    ];
  },

  setZIndex(options: DecodedObject, _item: LayerItemDescriptor<Label[]>, newZIndex: number) {
    options.labelsZIndex = newZIndex;
  },

  add(options: DecodedObject, item: Label[]) {
    options.labels = item;
  },

  delete(options: DecodedObject) {
    options.labels = [];
  },

  MapRenderer: MapCustomLabelHandler
};

export { default as MapCustomLabelHandler } from './MapCustomLabelHandler.svelte';
