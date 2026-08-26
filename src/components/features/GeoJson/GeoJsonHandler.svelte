<script lang="ts">
  import type { GeoJsonConfig } from '../../../lib/marker';
  import { fetchGeoJsonData } from './utils.ts';
  import { generateGeoJsonSourceId, Z_INDEX_GEOJSON } from '../layers/layerUtils.ts';
  import GeoJsonRenderer from './GeoJsonRenderer.svelte';

  let { config = [] } = $props<{ config?: GeoJsonConfig[] }>();

  // Local state to store parsed GeoJSON keyed by CMID or URL
  let dataMap = $state<Record<string, any>>({});

  function getItemKey(item: GeoJsonConfig): string {
    return item.url || (item.cmid ? String(item.cmid) : '');
  }

  // Check if all configurations have their data loaded
  const allLoaded = $derived.by(() => {
    if (config.length === 0) return true;
    return config.every((item: GeoJsonConfig) => {
      const key = getItemKey(item);
      return !key || !!dataMap[key];
    });
  });

  async function fetchAndParse(item: GeoJsonConfig) {
    const key = getItemKey(item);
    console.log('[GeoJsonHandler fetchAndParse:start]', { key, item });
    if (!key) return null;
    try {
      const data = await fetchGeoJsonData({ cmid: item.cmid, url: item.url });
      console.log('[GeoJsonHandler fetchAndParse:success]', { key, featureCount: data?.features?.length });
      return data;
    } catch (e) {
      console.error(`[GeoJsonHandler] Error loading GeoJSON source ${key}:`, e);
      return null;
    }
  }

  // Reactively fetch data when config changes
  $effect(() => {
    console.log('[GeoJsonHandler effect:config]', config);
    config.forEach((item: GeoJsonConfig) => {
      const key = getItemKey(item);
      if (key && !dataMap[key]) {
        fetchAndParse(item).then(data => {
          if (data) {
            dataMap = { ...dataMap, [key]: data };
          }
        });
      }
    });
  });
</script>

{#if allLoaded}
  {#each config as item, index (item.id || `${getItemKey(item)}-${index}`)}
    {@const key = getItemKey(item)}
    {#if dataMap[key]}
      <GeoJsonRenderer
        data={dataMap[key]}
        config={item}
        sourceId={generateGeoJsonSourceId(item.id || `${key}-${index}`)}
        zIndex={item.zIndex ?? Z_INDEX_GEOJSON + index * 0.1}
      />
    {/if}
  {/each}
{/if}
