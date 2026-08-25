import type { Component } from 'svelte';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { DecodedObject } from '../../lib/marker';

/**
 * Standard descriptor for an item displayed in the PropLayers visual list.
 */
export interface LayerItemDescriptor<T = any> {
  /** Unique ID for the item (e.g. "geojson-123", "icon-106753230-0", "builtin-labels") */
  id: string;
  /** The feature kind identifier (e.g. 'geojson', 'icon', 'image', 'mapLabels', 'customLabels') */
  kind: string;
  /** Primary label displayed in the layer list item */
  name: string;
  /** Secondary description/metadata displayed in the layer list item */
  description: string;
  /** Current stacking z-index */
  zIndex: number;
  /** Reference to the underlying data object (for array items) */
  data?: T;
}

/**
 * Standard interface implemented by each layer feature module.
 */
export interface LayerFeatureDefinition<T = any> {
  /** Unique identifier matching the feature kind (e.g. 'geojson', 'icon', 'image') */
  kind: string;

  /** Human-readable name for Add menus and builder headers (e.g. 'GeoJSON', 'Icon', 'Image Overlay') */
  label: string;

  /** Display icon component */
  icon: any;

  /** Default base z-index tier from layerManager */
  defaultZIndex: number;

  /** Whether multiple instances can be added as an array in DecodedObject */
  isMultiItem: boolean;

  /** Optional check if the feature can currently be added */
  canAdd?: (options: DecodedObject) => boolean;

  /**
   * Optional interactive map placement workflow before opening the config modal.
   * E.g. Icons allow clicking on the map to set initial coordinates.
   */
  interactivePlacement?: {
    prompt: string;
    onMapClick: (coords: [number, number], item: T) => void;
  };

  /**
   * Generates a new layer object populated with sensible defaults.
   */
  createDefault: (context: { maxZIndex: number; map?: MapLibreMap }) => T;

  /**
   * Extracts layer items from DecodedObject to populate the visual PropList.
   */
  getItems: (options: DecodedObject) => LayerItemDescriptor<T>[];

  /**
   * Updates an item's z-index when reordered in PropLayers.
   */
  setZIndex: (options: DecodedObject, item: LayerItemDescriptor<T>, newZIndex: number) => void;

  /**
   * Adds a newly instantiated layer object to the DecodedObject options.
   */
  add: (options: DecodedObject, item: T) => void;

  /**
   * Deletes a layer item from the DecodedObject options.
   */
  delete: (options: DecodedObject, item: LayerItemDescriptor<T>) => void;

  /**
   * Svelte modal component for editing or configuring this layer (prefixed with Builder).
   */
  ConfigModal?: Component<{
    config: any;
    onclose?: (bounds?: [number, number][]) => void;
  }>;

  /**
   * Svelte component rendered inside CustomGlobe to display the layer on MapLibre.
   * Gracefully bails out if the item data is incomplete (e.g. missing CMID or URL).
   */
  MapRenderer?: Component<{
    config?: any;
    options?: DecodedObject;
  }>;
}
