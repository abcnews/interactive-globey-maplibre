<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import type { GeoJsonConfig } from '../../../lib/marker';
  import { fetchGeoJsonData } from './utils.ts';
  import { isValidUrl } from '../../../lib/marker/utils.ts';
  import BuilderPropGeoJsonFilter from './BuilderPropGeoJsonFilter.svelte';
  import BuilderPropGeoJsonColour from './BuilderPropGeoJsonColour.svelte';
  import BuilderPropGeoJsonSize from './BuilderPropGeoJsonSize.svelte';
  import BuilderPropGeoJsonHeight from './BuilderPropGeoJsonHeight.svelte';
  import VerticalTabs from '../../Builder/shared/VerticalTabs.svelte';
  import Collapsible from '../../Builder/shared/Collapsible.svelte';
  import { ArrowUp, ArrowDown, Trash } from 'svelte-bootstrap-icons';
  import { untrack } from 'svelte';

  interface Props {
    /** The GeoJsonConfig object being edited or drafted */
    config: GeoJsonConfig;
    /** Callback fired when the modal requests to close */
    onclose?: (bounds?: [number, number][]) => void;
  }

  let { config = $bindable(), onclose }: Props = $props();

  let activeTab = $state<'config' | 'style'>('config');

  let rawSourceInput = $state<string>(
    untrack(() => {
      const snap = $state.snapshot(config);
      return snap?.url ? snap.url : (snap?.cmid ? String(snap.cmid) : '');
    })
  );

  let draftConfig = $state<GeoJsonConfig>(
    untrack(() => {
      const snap = $state.snapshot(config) || ({} as any);
      return {
        ...snap,
        type: snap.type ?? 'areas',
        colourMode: snap.colourMode ?? 'simple',
        cmid: snap.cmid ? snap.cmid : undefined,
        url: snap.url ?? undefined
      };
    })
  );
  let status = $state<'no-data' | 'loading' | 'loaded' | 'error'>(
    untrack(() => {
      const snap = $state.snapshot(config);
      return snap?.cmid || snap?.url ? 'loading' : 'no-data';
    })
  );
  let errorMessage = $state<string | undefined>();
  let properties = $state<string[]>([]);
  let featureCount = $state(0);
  let rawFeatures = $state<any[]>([]);
  let lastSourceKey = '';

  function isUrlInput(val: string): boolean {
    const trimmed = val.trim();
    if (!trimmed) return false;
    return (
      /^https?:\/\//i.test(trimmed) ||
      trimmed.startsWith('/') ||
      trimmed.includes('/') ||
      /\.(geojson|json|topojson)(\?.*)?$/i.test(trimmed) ||
      isNaN(Number(trimmed))
    );
  }

  async function fetchAndParse(source: { cmid?: number; url?: string }) {
    console.log('[BuilderGeoJsonConfigModal fetchAndParse:start]', source);
    if (source.cmid && (isNaN(source.cmid) || source.cmid <= 0)) {
      status = 'no-data';
      return;
    }
    if (source.url && !isValidUrl(source.url)) {
      status = 'no-data';
      return;
    }
    if (!source.cmid && !source.url) {
      status = 'no-data';
      return;
    }

    status = 'loading';
    errorMessage = undefined;
    try {
      const geojson = await fetchGeoJsonData(source);
      console.log('[BuilderGeoJsonConfigModal fetchAndParse:success]', { source, geojsonType: geojson?.type, featuresLength: geojson?.features?.length });

      // Analyze properties
      const propsSet = new Set<string>();
      let features: any[] = [];
      if (geojson.features && Array.isArray(geojson.features)) {
        features = geojson.features;
      } else if (geojson.type === 'Feature') {
        features = [geojson];
      }
      features.forEach((f: any) => {
        if (f.properties) {
          Object.keys(f.properties).forEach(k => propsSet.add(k));
        }
      });
      properties = Array.from(propsSet).sort();
      featureCount = features.length;
      rawFeatures = features;
      status = 'loaded';
    } catch (e: any) {
      console.error('[BuilderGeoJsonConfigModal fetchAndParse:error]', e);
      errorMessage = e.message;
      properties = [];
      featureCount = 0;
      rawFeatures = [];
      status = 'error';
    }
  }

  $effect(() => {
    const trimmed = rawSourceInput.trim();
    if (!trimmed) {
      status = 'no-data';
      lastSourceKey = '';
      return;
    }

    if (isUrlInput(trimmed)) {
      draftConfig.url = trimmed;
      delete (draftConfig as any).cmid;
      const currentKey = `url:${trimmed}`;
      if (currentKey !== lastSourceKey) {
        lastSourceKey = currentKey;
        fetchAndParse({ url: trimmed });
      }
    } else {
      const num = Number(trimmed);
      if (num > 0) {
        draftConfig.cmid = num;
        delete (draftConfig as any).url;
        const currentKey = `cmid:${num}`;
        if (currentKey !== lastSourceKey) {
          lastSourceKey = currentKey;
          fetchAndParse({ cmid: num });
        }
      } else {
        status = 'no-data';
        lastSourceKey = '';
      }
    }
  });

  function getUniqueValues(prop: string): string[] {
    const set = new Set<string>();
    rawFeatures.forEach(f => {
      if (f.properties && f.properties[prop] !== undefined) {
        set.add(String(f.properties[prop]));
      }
    });
    return Array.from(set).sort();
  }

  $effect(() => {
    // Ensure nested objects exist based on type
    if (draftConfig.type === 'spikes') {
      if (!draftConfig.spike) draftConfig.spike = { scalar: 2000000, heightProp: '' };
    }
  });

  $effect(() => {
    // Ensure styles array exists to be manipulated by the UI
    if (!draftConfig.styles) {
      if ((draftConfig as any).colourMode) {
        draftConfig.styles = [
          {
            colourMode: (draftConfig as any).colourMode,
            colourProp: (draftConfig as any).colourProp,
            colourConfig: (draftConfig as any).colourConfig,
            filter: (draftConfig as any).filter
          } as any
        ];
        delete (draftConfig as any).colourMode;
        delete (draftConfig as any).colourProp;
        delete (draftConfig as any).colourConfig;
        delete (draftConfig as any).filter;
        delete (draftConfig as any).opacity;
      } else {
        draftConfig.styles = [{ colourMode: 'basic' }];
      }
    }
  });

  function handleSave(goto = false) {
    const trimmed = rawSourceInput.trim();
    console.log('[BuilderGeoJsonConfigModal handleSave:start]', { trimmed, goto, draftConfig: $state.snapshot(draftConfig) });
    if (!trimmed) {
      alert('Please enter a valid CMID or URL.');
      return;
    }

    const isUrl = isUrlInput(trimmed);
    if (isUrl) {
      if (!isValidUrl(trimmed)) {
        console.warn('[BuilderGeoJsonConfigModal handleSave:invalid_url]', trimmed);
        alert('Preview URLs are not allowed. Please use a live-production or res/sites URL.');
        return;
      }
      config.url = trimmed;
      delete (config as any).cmid;
      config.type = draftConfig.type;
      config.styles = $state.snapshot(draftConfig.styles);
      config.pointSize = $state.snapshot(draftConfig.pointSize);
      config.lineWidth = $state.snapshot(draftConfig.lineWidth);
      config.spike = $state.snapshot(draftConfig.spike);
      console.log('[BuilderGeoJsonConfigModal handleSave:assigned_url]', { config: $state.snapshot(config) });
    } else {
      const numericCmid = Number(trimmed);
      if (!numericCmid || isNaN(numericCmid) || numericCmid <= 0) {
        console.warn('[BuilderGeoJsonConfigModal handleSave:invalid_cmid]', trimmed);
        alert('Please enter a valid CMID.');
        return;
      }
      config.cmid = numericCmid;
      delete (config as any).url;
      config.type = draftConfig.type;
      config.styles = $state.snapshot(draftConfig.styles);
      config.pointSize = $state.snapshot(draftConfig.pointSize);
      config.lineWidth = $state.snapshot(draftConfig.lineWidth);
      config.spike = $state.snapshot(draftConfig.spike);
      console.log('[BuilderGeoJsonConfigModal handleSave:assigned_cmid]', { config: $state.snapshot(config) });
    }

    let bounds: [number, number][] | undefined = undefined;
    if (goto && rawFeatures.length > 0) {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      const processGeometry = (geom: any) => {
        if (!geom) return;
        if (geom.type === 'Point') {
          const [x, y] = geom.coordinates;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        } else if (geom.type === 'LineString' || geom.type === 'MultiPoint') {
          geom.coordinates.forEach(([x, y]: [number, number]) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });
        } else if (geom.type === 'Polygon' || geom.type === 'MultiLineString') {
          geom.coordinates.forEach((ring: any) => {
            ring.forEach(([x, y]: [number, number]) => {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            });
          });
        } else if (geom.type === 'MultiPolygon') {
          geom.coordinates.forEach((poly: any) => {
            poly.forEach((ring: any) => {
              ring.forEach(([x, y]: [number, number]) => {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
              });
            });
          });
        } else if (geom.type === 'GeometryCollection') {
          geom.geometries.forEach(processGeometry);
        }
      };

      rawFeatures.forEach(f => processGeometry(f.geometry));

      if (minX !== Infinity) {
        bounds = [
          [minX, minY],
          [maxX, maxY]
        ];
      }
    }

    console.log('[BuilderGeoJsonConfigModal handleSave:calling_onclose]', { bounds, config: $state.snapshot(config) });
    onclose?.(bounds);
  }

  function addStyle() {
    draftConfig.styles = [...(draftConfig.styles ?? []), { colourMode: 'basic' }];
  }


  function removeStyle(index: number) {
    if (draftConfig.styles) {
      draftConfig.styles = draftConfig.styles.filter((_, i) => i !== index);
    }
  }

  function moveStyle(from: number, to: number) {
    if (!draftConfig.styles || to < 0 || to >= draftConfig.styles.length) return;
    const newStyles = [...draftConfig.styles];
    const [style] = newStyles.splice(from, 1);
    newStyles.splice(to, 0, style);
    draftConfig.styles = newStyles;
  }
</script>

{#snippet footerChildren()}
  <button onclick={() => handleSave(false)}>Save</button>
  <button onclick={() => handleSave(true)}>Save and Go To</button>
  <button onclick={() => onclose?.()}>Cancel</button>
{/snippet}

<Modal onClose={() => onclose?.()} title="Edit GeoJSON" {footerChildren}>
  <VerticalTabs
    tabs={[
      { id: 'config', label: 'Config' },
      { id: 'style', label: 'Style' }
    ]}
    bind:activeTab
  >
    {#if activeTab === 'config'}
      <fieldset>
        <legend
          >Data source
          {#if status === 'loaded'}
            (<small class="stat">{featureCount} features</small>)
          {/if}</legend
        >
        <div class="field-group">
          <label for="gj-source">CMID or GeoJSON / TopoJSON URL</label>
          <div class="source-input-row">
            <input
              id="gj-source"
              type="text"
              placeholder="e.g. 106753230 or https://..."
              bind:value={rawSourceInput}
            />
            {#if status === 'loading'}
              <span class="source-loading-badge">Loading...</span>
            {/if}
          </div>
          <small class="help-text">
            Enter a CoreMedia document ID (CMID) or paste a direct GeoJSON / TopoJSON URL.
          </small>
        </div>

        {#if status === 'loading'}
          <div style:padding="0.5rem 0">Loading metadata...</div>
        {/if}
        {#if status === 'error'}
          <div style:padding="0.5rem 0" style="color:var(--builder-color-danger, red)">{errorMessage}</div>
        {/if}
      </fieldset>

      {#if status === 'loaded'}
        <fieldset>
          <legend>Geometry Type</legend>
          <div style:display="flex" style:gap="1rem">
            {#each ['areas', 'lines', 'points', 'spikes'] as type}
              <label
                style:display="flex"
                style:align-items="center"
                style:gap="0.5rem"
                style:cursor="pointer"
                style:text-transform="capitalize"
              >
                <input type="radio" name="gj-type" value={type} bind:group={draftConfig.type} />
                {type}
              </label>
            {/each}
          </div>
        </fieldset>

        {#if draftConfig.type === 'points' || draftConfig.type === 'spikes'}
          <BuilderPropGeoJsonSize bind:config={draftConfig} prop="pointSize" legend="Point Size" />
        {/if}

        {#if draftConfig.type === 'lines'}
          <BuilderPropGeoJsonSize bind:config={draftConfig} prop="lineWidth" legend="Line Width" />
        {/if}

        {#if draftConfig.type === 'spikes'}
          <BuilderPropGeoJsonHeight bind:config={draftConfig} {properties} features={rawFeatures} />
        {/if}
      {/if}
    {:else if activeTab === 'style'}
      {#if status === 'loaded'}
        {#if draftConfig.styles}
          <p class="gj-note">Adjust how your GeoJSON displays. Styles are matched in order, from top to bottom.</p>

          {#each draftConfig.styles as style, i}
            <Collapsible open={i === 0}>
              {#snippet header()}
                <h4 style:margin="0" style:display="inline-block; font-size: 0.9em;">
                  Style {i + 1}
                  {#if style.filter?.prop}
                    : <span style:font-family="monospace">{style.filter.prop}</span>
                    {#if style.filter.values?.length > 0}
                      <small class="stat"
                        >: {style.filter.values.join(', ').slice(0, 30)}{style.filter.values.join(', ').length > 30
                          ? '...'
                          : ''}</small
                      >
                    {/if}
                  {/if}
                </h4>
              {/snippet}
              {#snippet actions()}
                <div class="gj-actions">
                  <button
                    type="button"
                    class="gj-btn-icon"
                    disabled={i === 0}
                    onclick={() => moveStyle(i, i - 1)}
                    title="Move Up"
                  >
                    <ArrowUp width="12" height="12" />
                  </button>
                  <button
                    type="button"
                    class="gj-btn-icon"
                    disabled={i === (draftConfig.styles?.length ?? 0) - 1}
                    onclick={() => moveStyle(i, i + 1)}
                    title="Move Down"
                  >
                    <ArrowDown width="12" height="12" />
                  </button>
                  {#if draftConfig.styles && draftConfig.styles.length > 1}
                    <button
                      type="button"
                      class="gj-btn-icon gj-btn-danger"
                      onclick={() => removeStyle(i)}
                      title="Remove Style"
                    >
                      <Trash width="12" height="12" />
                    </button>
                  {/if}
                </div>
              {/snippet}

              <BuilderPropGeoJsonFilter bind:style={draftConfig.styles[i]} {properties} {getUniqueValues} />

              <BuilderPropGeoJsonColour bind:style={draftConfig.styles[i]} {properties} features={rawFeatures} />
            </Collapsible>
          {/each}

          <div style:margin-bottom="1rem">
            <button type="button" onclick={addStyle}>+ Add Another Style</button>
          </div>

        {/if}
      {:else}
        <div style:padding="1rem" style:text-align="center" style:color="var(--text-light, #888)">
          Loading data to configure styles...
        </div>
      {/if}
    {/if}
  </VerticalTabs>
</Modal>

<style>
  .gj-note {
    font-size: 0.85em;
    color: var(--text-light, #888);
    opacity: 0.8;
    margin-bottom: 0.75rem;
    padding: 0 0.25rem;
  }

  .gj-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .gj-btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    background: none;
    border: 1px solid transparent;
    cursor: pointer;
    color: var(--text-light, #888);
    border-radius: 4px;
    transition: all 0.2s;
  }

  .gj-btn-icon:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text, #ccc);
    border-color: var(--border, rgba(122, 123, 135, 0.5));
  }

  .gj-btn-icon.gj-btn-danger:hover:not(:disabled) {
    color: var(--builder-color-danger, #ff4444);
    background-color: rgba(255, 68, 68, 0.1);
    border-color: var(--builder-color-danger, #ff4444);
  }

  .gj-btn-icon:disabled {
    opacity: 0.2;
    cursor: not-allowed;
  }

  .source-input-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: relative;
  }

  .source-input-row input {
    flex: 1;
    width: 100%;
    box-sizing: border-box;
  }

  .source-loading-badge {
    position: absolute;
    right: 0.5rem;
    font-size: 0.75rem;
    color: var(--text-light, #888);
    pointer-events: none;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field-group label {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .help-text {
    font-size: 0.75rem;
    color: var(--text-light, #888);
  }

  .help-text code {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.1rem 0.25rem;
    border-radius: 2px;
  }
</style>
