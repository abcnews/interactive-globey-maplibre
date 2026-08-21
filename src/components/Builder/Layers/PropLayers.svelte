<script lang="ts">
  import type { Map as MapLibreMap } from 'maplibre-gl';
  import type { DecodedObject, GeoJsonConfig, ImageSourceConfig, Label } from '../../../lib/marker';
  import {
    Z_INDEX_GEOJSON,
    Z_INDEX_IMAGE_LAYERS,
    Z_INDEX_CUSTOM_LABELS
  } from '../../CustomGlobe/features/layerUtils';
  import { safeFitBounds } from '../utils';
  import PropList from '../PropList.svelte';
  import GeoJsonConfigModal from '../GeoJSON/GeoJsonConfigModal.svelte';
  import ImageSourceConfigModal from '../ImageSource/ImageSourceConfigModal.svelte';
  import {
    Pencil,
    Trash,
    Plus,
    Image as ImageIcon,
    Map as MapIcon,
    ChatSquareText
  } from 'svelte-bootstrap-icons';

  export type LayerKind = 'geojson' | 'image' | 'labels';

  const LAYER_ICONS: Record<LayerKind, typeof MapIcon> = {
    geojson: MapIcon,
    image: ImageIcon,
    labels: ChatSquareText
  };

  export interface LayerItem {
    id: string;
    kind: LayerKind;
    name: string;
    description: string;
    zIndex: number;
    data?: GeoJsonConfig | ImageSourceConfig | Label[];
    editable?: boolean;
    deletable?: boolean;
  }

  interface Props {
    /** Marker options decoded object bound to the builder. */
    options: DecodedObject;
    /** MapLibre Map instance for bounds fitting and interactions. */
    map?: MapLibreMap;
  }

  let { options = $bindable(), map }: Props = $props();

  /** The existing layer item currently being edited in a modal dialog. */
  let editingItem = $state<LayerItem | null>(null);
  /** The layer kind currently being added via an add modal. */
  let isAdding = $state<LayerKind | null>(null);
  /** Temporary empty config draft when creating a new layer. */
  let newLayerDraft = $state<any>(null);
  /** Whether the "Add Layer" dropdown menu is open. */
  let showAddMenu = $state(false);

  /** Visual layer stack ordered from top (highest z-index) to bottom */
  const layers = $derived.by<LayerItem[]>(() => {
    const geojson: LayerItem[] = (options.geoJson || []).map((item, idx) => ({
      id: `geojson-${item.cmid || idx}`,
      kind: 'geojson',
      name: item.type ? `${item.type.charAt(0).toUpperCase() + item.type.slice(1)}` : 'GeoJSON',
      description: item.cmid ? `CMID: ${item.cmid}` : 'No CMID',
      zIndex: item.zIndex ?? Z_INDEX_GEOJSON + idx * 0.1,
      data: item,
      editable: true,
      deletable: true
    }));

    const img: LayerItem[] = (options.imageSources || []).map((item, idx) => ({
      id: `img-${item.id || idx}`,
      kind: 'image',
      name: item.url ? item.url.split('?')[0].split('/').pop() || item.url : 'Image',
      description: `Opacity: ${Math.round((item.opacity ?? 1) * 100)}%`,
      zIndex: item.zIndex ?? Z_INDEX_IMAGE_LAYERS + idx * 0.1,
      data: item,
      editable: true,
      deletable: true
    }));

    const labelItems: LayerItem[] =
      options.labels && options.labels.length > 0
        ? [
            {
              id: 'custom-labels',
              kind: 'labels',
              name: 'Custom Labels',
              description: `${options.labels.length} label${options.labels.length === 1 ? '' : 's'}`,
              zIndex: options.labelsZIndex ?? Z_INDEX_CUSTOM_LABELS,
              data: options.labels,
              editable: false,
              deletable: false
            }
          ]
        : [];

    return [...geojson, ...img, ...labelItems].sort((a, b) => b.zIndex - a.zIndex);
  });

  function getOptionKey(kind: LayerKind): 'geoJson' | 'imageSources' {
    return kind === 'geojson' ? 'geoJson' : 'imageSources';
  }

  function handleReorder(newItems: LayerItem[]) {
    const total = newItems.length;
    const baseZ = Z_INDEX_IMAGE_LAYERS;

    newItems.forEach((item, idx) => {
      const assignedZ = baseZ + (total - 1 - idx) * 10;
      if (item.kind === 'geojson' && item.data) {
        (item.data as GeoJsonConfig).zIndex = assignedZ;
      } else if (item.kind === 'image' && item.data) {
        (item.data as ImageSourceConfig).zIndex = assignedZ;
      } else if (item.kind === 'labels') {
        options.labelsZIndex = assignedZ;
      }
    });

    options.geoJson = newItems
      .filter(item => item.kind === 'geojson')
      .map(item => item.data as GeoJsonConfig);

    options.imageSources = newItems
      .filter(item => item.kind === 'image')
      .map(item => item.data as ImageSourceConfig);
  }

  function removeLayer(item: LayerItem) {
    if (!item.deletable) return;
    const key = getOptionKey(item.kind);
    options[key] = ((options[key] as any[]) || []).filter(entry => entry !== item.data);
  }

  function addLayer(kind: LayerKind) {
    showAddMenu = false;
    isAdding = kind;
    editingItem = null;

    const defaultZ = kind === 'geojson' ? Z_INDEX_GEOJSON : Z_INDEX_IMAGE_LAYERS;
    const maxZ = layers.length > 0 ? Math.max(...layers.map(l => l.zIndex)) : defaultZ;
    newLayerDraft = { zIndex: maxZ + 10 };
  }

  function editLayer(item: LayerItem) {
    if (!item.editable) return;
    editingItem = item;
    isAdding = null;
    newLayerDraft = null;
    showAddMenu = false;
  }

  function handleClose(bounds?: [number, number][]) {
    if (bounds && map) {
      safeFitBounds(map, bounds, { padding: 50 });
    }

    // If saving a new layer, append to options
    if (isAdding && newLayerDraft) {
      if (isAdding === 'geojson' && newLayerDraft.cmid) {
        options.geoJson = [...(options.geoJson || []), newLayerDraft];
      } else if (isAdding === 'image' && newLayerDraft.url) {
        options.imageSources = [...(options.imageSources || []), newLayerDraft];
      }
    }

    editingItem = null;
    isAdding = null;
    newLayerDraft = null;
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
          <button type="button" onclick={() => addLayer('geojson')}>
            <MapIcon /> GeoJSON
          </button>
          <button type="button" onclick={() => addLayer('image')}>
            <ImageIcon /> Image Overlay
          </button>
        </div>
      {/if}
    </div>
  </legend>

  {#if layers.length === 0}
    <small>Click <code>+</code> to add a GeoJSON or Image layer</small>
  {:else}
    <PropList items={layers} onchange={handleReorder}>
      {#snippet name(item: LayerItem)}
        {@const Icon = LAYER_ICONS[item.kind]}
        <span class="layer-name">
          {#if Icon}
            <Icon class="layer-icon" />
          {/if}
          <strong>{item.name}</strong>
        </span>
      {/snippet}
      {#snippet description(item: LayerItem)}
        <span class="layer-desc">{item.description}</span>
      {/snippet}
      {#snippet actions(item: LayerItem)}
        {#if item.editable}
          <button
            class="btn-icon"
            aria-label="Edit"
            title="Edit"
            onclick={() => editLayer(item)}
          >
            <Pencil />
          </button>
        {/if}
        {#if item.deletable}
          <button class="btn-icon" aria-label="Delete" title="Delete" onclick={() => removeLayer(item)}>
            <Trash />
          </button>
        {/if}
      {/snippet}
    </PropList>
  {/if}

  {#if isAdding === 'geojson'}
    <GeoJsonConfigModal
      bind:config={newLayerDraft}
      onclose={handleClose}
    />
  {:else if editingItem?.kind === 'geojson'}
    {@const idx = options.geoJson?.indexOf(editingItem.data as GeoJsonConfig)}
    {#if idx !== undefined && idx !== -1}
      <GeoJsonConfigModal
        bind:config={options.geoJson![idx]}
        onclose={handleClose}
      />
    {/if}
  {/if}

  {#if isAdding === 'image'}
    <ImageSourceConfigModal
      bind:config={newLayerDraft}
      onclose={handleClose}
    />
  {:else if editingItem?.kind === 'image'}
    {@const idx = options.imageSources?.indexOf(editingItem.data as ImageSourceConfig)}
    {#if idx !== undefined && idx !== -1}
      <ImageSourceConfigModal
        bind:config={options.imageSources![idx]}
        onclose={handleClose}
      />
    {/if}
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
