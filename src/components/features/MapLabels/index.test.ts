import { describe, it, assert } from 'vitest';
import { mapLabelsFeature } from './index.ts';
import { DEFAULT_MAP_LABELS, DISABLED_MAP_LABELS } from '../../../lib/marker/utils.ts';
import { Z_INDEX_BASE_LABELS } from '../layers/layerUtils.ts';
import type { DecodedObject } from '../../../lib/marker/types.ts';

describe('MapLabels Feature Definition', () => {
  it('should have correct metadata and defaults', () => {
    assert.strictEqual(mapLabelsFeature.kind, 'mapLabels');
    assert.strictEqual(mapLabelsFeature.label, 'Map Labels');
    assert.strictEqual(mapLabelsFeature.defaultZIndex, Z_INDEX_BASE_LABELS);
    assert.strictEqual(mapLabelsFeature.isMultiItem, false);
    assert.ok(mapLabelsFeature.ConfigModal);
  });

  it('canAdd should return true when mapLabels is absent or marked disabled', () => {
    const optionsActive: DecodedObject = {
      mapLabels: { ...DEFAULT_MAP_LABELS }
    } as any;
    const optionsAllDeselectedButActive: DecodedObject = {
      mapLabels: { ...DISABLED_MAP_LABELS }
    } as any;
    const optionsDeleted: DecodedObject = {
      mapLabels: { ...DISABLED_MAP_LABELS, _disabled: true }
    } as any;
    const optionsNull: DecodedObject = {
      mapLabels: null
    } as any;

    assert.strictEqual(mapLabelsFeature.canAdd?.(optionsActive), false);
    assert.strictEqual(mapLabelsFeature.canAdd?.(optionsAllDeselectedButActive), false);
    assert.strictEqual(mapLabelsFeature.canAdd?.(optionsDeleted), true);
    assert.strictEqual(mapLabelsFeature.canAdd?.(optionsNull), true);
  });

  it('getItems should return descriptor when layer is active even with all labels deselected', () => {
    const optionsDeselected: DecodedObject = {
      mapLabels: { ...DISABLED_MAP_LABELS },
      mapLabelsZIndex: 510
    } as any;

    const items = mapLabelsFeature.getItems(optionsDeselected);
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].id, 'map-labels');
    assert.strictEqual(items[0].zIndex, 510);
  });

  it('getItems should return empty array when layer is explicitly deleted (_disabled is true)', () => {
    const optionsDeleted: DecodedObject = {
      mapLabels: { ...DISABLED_MAP_LABELS, _disabled: true }
    } as any;

    const items = mapLabelsFeature.getItems(optionsDeleted);
    assert.strictEqual(items.length, 0);
  });

  it('setZIndex should mutate mapLabelsZIndex on options', () => {
    const options: DecodedObject = {
      mapLabels: { ...DEFAULT_MAP_LABELS }
    } as any;

    const [item] = mapLabelsFeature.getItems(options);
    mapLabelsFeature.setZIndex(options, item, 550);
    assert.strictEqual(options.mapLabelsZIndex, 550);
  });

  it('createDefault should have all text labels checked (true)', () => {
    const defaultItem = mapLabelsFeature.createDefault({ maxZIndex: 500 });
    assert.strictEqual(defaultItem.countriesMajor, true);
    assert.strictEqual(defaultItem.countriesMedium, true);
    assert.strictEqual(defaultItem.countriesMinor, true);
    assert.strictEqual(defaultItem.continents, true);
    assert.strictEqual(defaultItem.states, true);
    assert.strictEqual(defaultItem.cities, true);
    assert.strictEqual(defaultItem.towns, true);
    assert.strictEqual(defaultItem.oceans, true);
  });

  it('add should populate all map labels as true and remove _disabled', () => {
    const options: DecodedObject = {
      mapLabels: { ...DISABLED_MAP_LABELS, _disabled: true }
    } as any;

    const defaultItem = mapLabelsFeature.createDefault({ maxZIndex: 500 });
    mapLabelsFeature.add(options, defaultItem);
    assert.strictEqual(options.mapLabels?.countriesMajor, true);
    assert.strictEqual(options.mapLabels?.continents, true);
    assert.strictEqual(options.mapLabels?.cities, true);
    assert.strictEqual(options.mapLabels?.towns, true);
    assert.strictEqual((options.mapLabels as any)?._disabled, undefined);
  });

  it('delete should mark _disabled true and disable text labels', () => {
    const options: DecodedObject = {
      mapLabels: { ...DEFAULT_MAP_LABELS }
    } as any;

    const [item] = mapLabelsFeature.getItems(options);
    mapLabelsFeature.delete(options, item);
    assert.strictEqual(options.mapLabels?.countriesMajor, false);
    assert.strictEqual(options.mapLabels?.countriesMedium, false);
    assert.strictEqual(options.mapLabels?.countriesMinor, false);
    assert.strictEqual((options.mapLabels as any)?._disabled, true);
  });
});
