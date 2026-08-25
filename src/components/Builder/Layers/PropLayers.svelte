<script lang="ts">
  import type { Map as MapLibreMap } from 'maplibre-gl';
  import type { DecodedObject } from '../../../lib/marker';
  import {
    layerFeatureRegistry,
    Z_INDEX_IMAGE_LAYERS,
    type LayerItemDescriptor,
    type LayerFeatureDefinition
  } from '../../features';
  import { safeFitBounds } from '../utils';
  import PropList from '../PropList.svelte';
  import { Pencil, Trash, Plus } from 'svelte-bootstrap-icons';

  interface Props {
    /** Marker options decoded object bound to the builder. */
    options: DecodedObject;
    /** MapLibre Map instance for bounds fitting and interactions. */
    map?: MapLibreMap;
  }

  let { options = $bindable(), map }: Props = $props();

  /** The item currently being edited in a modal dialog */
  let editingItem = $state<{
    feature: LayerFeatureDefinition<any>;
    descriptor: LayerItemDescriptor<any>;
    data: any;
  } | null>(null);

  /** Active interactive placement state (e.g. click-to-place icons) */
  let activePlacement = $state<{
    feature: LayerFeatureDefinition<any>;
    prompt: string;
    item: any;
  } | null>(null);

  /** Whether the "Add Layer" dropdown menu is open. */
  let showAddMenu = $state(false);

  function openEditModal(feature: LayerFeatureDefinition<any>, item: LayerItemDescriptor<any>) {
    editingItem = {
      feature,
      descriptor: item,
      data: item.data
    };
    showAddMenu = false;
  }

  /** Visual layer stack ordered from top (highest z-index) to bottom */
  const layers = $derived.by(() => {
    const list: (LayerItemDescriptor<any> & {
      feature: LayerFeatureDefinition<any>;
      onEdit?: () => void;
      onDelete?: () => void;
    })[] = [];

    layerFeatureRegistry.forEach(feature => {
      const items = feature.getItems(options);
      items.forEach(item => {
        list.push({
          ...item,
          feature,
          onEdit: feature.ConfigModal ? () => openEditModal(feature, item) : undefined,
          onDelete: () => feature.delete(options, item)
        });
      });
    });

    return list.sort((a, b) => b.zIndex - a.zIndex);
  });

  function handleReorder(newItems: typeof layers) {
    const total = newItems.length;
    const baseZ = Z_INDEX_IMAGE_LAYERS;

    newItems.forEach((item, idx) => {
      const assignedZ = baseZ + (total - 1 - idx) * 10;
      item.feature.setZIndex(options, item, assignedZ);
    });
    options = {
      ...options,
      rasterLayers: options.rasterLayers ? [...options.rasterLayers] : [],
      imageSources: options.imageSources ? [...options.imageSources] : [],
      geoJson: options.geoJson ? [...options.geoJson] : [],
      icons: options.icons ? [...options.icons] : []
    };
  }

  function addLayer(feature: LayerFeatureDefinition<any>) {
    showAddMenu = false;
    editingItem = null;

    const maxZ = layers.length > 0 ? Math.max(...layers.map(l => l.zIndex)) + 10 : feature.defaultZIndex;
    const newItem = feature.createDefault({ maxZIndex: maxZ, map });

    if (feature.interactivePlacement) {
      activePlacement = {
        feature,
        prompt: feature.interactivePlacement.prompt,
        item: newItem
      };
    } else {
      feature.add(options, newItem);
      if (feature.ConfigModal) {
        openEditModal(feature, {
          id: `${feature.kind}-${Date.now()}`,
          kind: feature.kind,
          name: feature.label,
          description: '',
          zIndex: maxZ,
          data: newItem
        });
      }
    }
  }

  function handleMapClick(e: any) {
    if (!activePlacement) return;
    const { feature, item } = activePlacement;
    const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];

    feature.interactivePlacement?.onMapClick(coords, item);
    feature.add(options, item);

    const placementMaxZ = layers.length > 0 ? Math.max(...layers.map(l => l.zIndex)) + 10 : feature.defaultZIndex;

    activePlacement = null;

    if (feature.ConfigModal) {
      openEditModal(feature, {
        id: `${feature.kind}-${Date.now()}`,
        kind: feature.kind,
        name: feature.label,
        description: '',
        zIndex: placementMaxZ,
        data: item
      });
    }
  }

  $effect(() => {
    if (!map) return;

    if (activePlacement) {
      map.getCanvas().style.cursor = 'crosshair';
      map.on('click', handleMapClick);
    } else {
      map.getCanvas().style.cursor = '';
      map.off('click', handleMapClick);
    }

    return () => {
      map.off('click', handleMapClick);
      if (map.getCanvas()) map.getCanvas().style.cursor = '';
    };
  });

  function handleClose(bounds?: [number, number][]) {
    if (bounds && map) {
      safeFitBounds(map, bounds, { padding: 50 });
    }
    // Clean up empty or invalid added item if no cmid or no url
    if (editingItem) {
      const { feature, descriptor, data } = editingItem;
      const currentData = descriptor.data || data;
      if (feature.kind === 'icon' && !currentData?.cmid) {
        feature.delete(options, descriptor);
      } else if (feature.kind === 'geojson' && !currentData?.cmid) {
        feature.delete(options, descriptor);
      } else if (feature.kind === 'image' && !currentData?.url) {
        feature.delete(options, descriptor);
      }
    }
    options = { ...options };
    editingItem = null;
  }
</script>

<fieldset class="prop-layers">
  <legend>
    <span>Layers</span>
    <div class="add-container">
      <button class="btn-icon" aria-label="Add Layer" title="Add Layer" onclick={() => (showAddMenu = !showAddMenu)}>
        <Plus />
      </button>
      {#if showAddMenu}
        <div class="add-menu">
          {#each layerFeatureRegistry as feature (feature.kind)}
            {#if !feature.canAdd || feature.canAdd(options)}
              <button type="button" onclick={() => addLayer(feature)}>
                <feature.icon /> {feature.label}
              </button>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </legend>

  {#if activePlacement}
    <small style:display="block" style:margin-bottom="0.5rem" style:color="#64b5f6">
      {activePlacement.prompt}
    </small>
  {/if}

  {#if layers.length === 0}
    <small>Click <code>+</code> to add a layer</small>
  {:else}
    <PropList items={layers} onchange={handleReorder}>
      {#snippet name(item)}
        {@const Icon = item.feature.icon}
        <span class="layer-name">
          {#if Icon}
            <Icon class="layer-icon" />
          {/if}
          <strong>{item.name}</strong>
        </span>
      {/snippet}
      {#snippet description(item)}
        <span class="layer-desc">{item.description}</span>
      {/snippet}
      {#snippet actions(item)}
        {#if item.onEdit}
          <button class="btn-icon" aria-label="Edit" title="Edit" onclick={item.onEdit}>
            <Pencil />
          </button>
        {/if}
        {#if item.onDelete}
          <button class="btn-icon" aria-label="Delete" title="Delete" onclick={item.onDelete}>
            <Trash />
          </button>
        {/if}
      {/snippet}
    </PropList>
  {/if}

  {#if editingItem?.feature.ConfigModal}
    <editingItem.feature.ConfigModal bind:config={editingItem.data} onclose={handleClose} />
  {/if}
</fieldset>

<style>
  .prop-layers legend {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .add-container {
    position: relative;
    display: inline-block;
  }

  .add-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    background: var(--background-alt, #2c2c2f);
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
    border-radius: 4px;
    padding: 0.25rem 0;
    display: flex;
    flex-direction: column;
    z-index: 100;
    min-width: 140px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .add-menu button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    color: var(--text, #ccc);
    padding: 0.4rem 0.75rem;
    text-align: left;
    cursor: pointer;
    font-size: 0.85rem;
    width: 100%;
    border-radius: 0;
  }

  .add-menu button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .layer-name {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.layer-icon) {
    flex-shrink: 0;
    opacity: 0.8;
  }

  .layer-desc {
    color: var(--text-light, #888);
  }
</style>
