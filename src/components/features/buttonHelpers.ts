import { Pencil, Trash } from 'svelte-bootstrap-icons';
import type { LayerButton, LayerFeatureDefinition, LayerItemDescriptor } from './types.ts';
import type { DecodedObject } from '../../lib/marker';

/**
 * Creates a standard Edit action button that opens the feature's configuration modal.
 */
export function createEditButton<T = any>({
  title = 'Edit',
  ariaLabel
}: { title?: string; ariaLabel?: string } = {}): LayerButton<T> {
  return {
    id: 'edit',
    title,
    ariaLabel: ariaLabel || title,
    icon: Pencil,
    onclick: ({ openModal }) => {
      openModal();
    }
  };
}

/**
 * Creates a standard Delete action button that removes the layer item.
 */
export function createDeleteButton<T = any>({
  title = 'Delete',
  ariaLabel
}: { title?: string; ariaLabel?: string } = {}): LayerButton<T> {
  return {
    id: 'delete',
    title,
    ariaLabel: ariaLabel || title,
    icon: Trash,
    onclick: ({ options, item }) => {
      const feature = (item as any).feature as LayerFeatureDefinition<T> | undefined;
      if (feature?.delete) {
        feature.delete(options, item);
      }
    }
  };
}

/**
 * Resolves the default action buttons for a feature item if none are explicitly declared.
 */
export function getDefaultLayerButtons<T = any>(
  feature: LayerFeatureDefinition<T>,
  _item?: LayerItemDescriptor<T>,
  _options?: DecodedObject
): LayerButton<T>[] {
  const buttons: LayerButton<T>[] = [];
  if (feature.ConfigModal) {
    buttons.push(createEditButton<T>());
  }
  if (feature.delete) {
    buttons.push(createDeleteButton<T>());
  }
  return buttons;
}
