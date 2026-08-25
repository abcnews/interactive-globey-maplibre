import type { LayerFeatureDefinition, LayerItemDescriptor } from '../types.ts';
import type { DecodedObject, MapLabelsConfig } from '../../../lib/marker';
import { Z_INDEX_BASE_LABELS } from '../layers/layerUtils.ts';
import { Tag as LabelIcon } from 'svelte-bootstrap-icons';
import { createEditButton, createDeleteButton } from '../buttonHelpers.ts';
import BuilderMapLabelsConfigModal from './BuilderMapLabelsConfigModal.svelte';

export const mapLabelsFeature: LayerFeatureDefinition<MapLabelsConfig> = {
  kind: 'mapLabels',
  label: 'Map Labels',
  icon: LabelIcon,
  defaultZIndex: Z_INDEX_BASE_LABELS,
  isMultiItem: false,

  buttons: [
    createEditButton<MapLabelsConfig>({ title: 'Edit map labels' }),
    createDeleteButton<MapLabelsConfig>({ title: 'Hide map labels' })
  ],

  canAdd(options: DecodedObject) {
    if (!options.mapLabels) return true;
    return (options.mapLabels as any)._disabled === true;
  },

  createDefault() {
    return {
      countriesMajor: true,
      countriesMedium: true,
      countriesMinor: true,
      continents: true,
      states: true,
      cities: true,
      towns: true,
      oceans: true
    };
  },

  getItems(options: DecodedObject): LayerItemDescriptor<MapLabelsConfig>[] {
    if (!options.mapLabels) return [];
    if ((options.mapLabels as any)._disabled === true) return [];
    return [
      {
        id: 'map-labels',
        kind: 'mapLabels',
        name: 'Map Labels',
        description: 'Built-in Country and City Names',
        zIndex: options.mapLabelsZIndex ?? Z_INDEX_BASE_LABELS,
        data: options.mapLabels
      }
    ];
  },

  setZIndex(options: DecodedObject, _item: LayerItemDescriptor<MapLabelsConfig>, newZIndex: number) {
    options.mapLabelsZIndex = newZIndex;
  },

  add(options: DecodedObject, item: MapLabelsConfig) {
    options.mapLabels = {
      countriesMajor: item?.countriesMajor ?? true,
      countriesMedium: item?.countriesMedium ?? true,
      countriesMinor: item?.countriesMinor ?? true,
      continents: item?.continents ?? true,
      states: item?.states ?? true,
      cities: item?.cities ?? true,
      towns: item?.towns ?? true,
      oceans: item?.oceans ?? true
    };
    delete (options.mapLabels as any)._disabled;
  },

  delete(options: DecodedObject) {
    if (options.mapLabels) {
      options.mapLabels = {
        ...options.mapLabels,
        _disabled: true,
        countriesMajor: false,
        countriesMedium: false,
        countriesMinor: false,
        continents: false,
        states: false,
        cities: false,
        towns: false,
        oceans: false
      };
    }
  },

  ConfigModal: BuilderMapLabelsConfigModal
};

export { default as BuilderMapLabelsConfigModal } from './BuilderMapLabelsConfigModal.svelte';
