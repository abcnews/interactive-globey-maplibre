<script lang="ts">
  import type { DecodedObject } from '../../../lib/marker';
  import { DEFAULT_MAP_LABELS } from '../../../lib/marker';
  import type * as maplibregl from 'maplibre-gl';
  import { Modal } from '@abcnews/components-builder';
  import { Pencil, X } from 'svelte-bootstrap-icons';

  let { options = $bindable(), map } = $props<{ options: DecodedObject; map: maplibregl.Map }>();
  let isOpen = $state(false);

  function update(key: keyof DecodedObject, value: any) {
    options = {
      ...options,
      [key]: value
    };
  }

  function updateMapLabel(key: string, value: any) {
    const current = options.mapLabels || { ...DEFAULT_MAP_LABELS };
    const next = { ...current };
    (next as any)[key] = value;
    options = {
      ...options,
      mapLabels: next
    };
  }
</script>

<fieldset>
  <legend
    >Map Base
    <button class="btn-icon" onclick={() => (isOpen = true)} aria-label="Edit map base" title="Edit map base">
      <Pencil />
    </button></legend
  >
  <div class="prop-base-summary">
    <span class="value">
      <strong>{options.projection === 'mercator' ? 'Flat (Mercator)' : 'Globe'}</strong>
    </span>
  </div>
</fieldset>

{#if isOpen}
  <Modal onClose={() => (isOpen = false)} title="Map Base & Style" position="right">
    <div class="prop-base">
      <div class="prop-base__layer">
        <div>
          <fieldset>
            <legend>Projection</legend>
            <div class="radio-group">
              <label>
                <input
                  type="radio"
                  name="projection"
                  value="globe"
                  checked={options.projection === 'globe' || !options.projection}
                  onchange={() => update('projection', 'globe')}
                />
                Globe
              </label>
              <label>
                <input
                  type="radio"
                  name="projection"
                  value="mercator"
                  checked={options.projection === 'mercator'}
                  onchange={() => update('projection', 'mercator')}
                />
                Flat
              </label>
            </div>
          </fieldset>
          <fieldset class="sub-options">
            <legend>Boundaries</legend>
            <div class="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={options.mapLabels?.nationalBoundaries ?? true}
                  onchange={e => updateMapLabel('nationalBoundaries', e.currentTarget.checked)}
                />
                National
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.mapLabels?.stateBoundaries ?? false}
                  onchange={e => updateMapLabel('stateBoundaries', e.currentTarget.checked)}
                />
                State
              </label>
            </div>
          </fieldset>
        </div>
        <div>
          <fieldset>
            <legend>Attribution</legend>

            <div class="builder__inline">
              <label class="builder__inline" style="flex:1"
                >Text
                <input
                  id="text_attribution"
                  type="text"
                  placeholder="e.g. Map data © ..."
                  value={options.attribution || ''}
                  oninput={e => update('attribution', e.currentTarget.value)}
                  style="flex:1;width:auto;"
                />
              </label>

              <button
                class="btn-icon"
                title="Clear attribution"
                aria-label="Clear attribution"
                onclick={() => update('attribution', '')}
              >
                <X width="16" height="16" />
              </button>
            </div>
          </fieldset>
          <fieldset class="sub-options">
            <legend>Animation</legend>
            <label>
              <input type="number" bind:value={options.animationDuration} />
              Duration (ms)
            </label>
          </fieldset>
        </div>
      </div>
    </div>

    {#snippet footerChildren()}
      <button onclick={() => (isOpen = false)}>Close</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .prop-base {
    width: 30rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: hidden;
  }
  .prop-base__layer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .prop-base-summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
  }
  .value {
    flex: 1;
  }
  .radio-group,
  .checkbox-group {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 0.25rem;
  }
  .radio-group label,
  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
  }
</style>
