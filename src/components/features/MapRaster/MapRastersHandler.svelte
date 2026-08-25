<script lang="ts">
  import type { RasterLayerConfig } from '../../../lib/marker/types.ts';
  import { Z_INDEX_BASE_RASTER } from '../layers/layerUtils.ts';
  import MapRasterHandler from './MapRasterHandler.svelte';

  interface Props {
    /** List of raster layer configurations to mount on the map */
    config?: RasterLayerConfig[];
  }

  let { config = [] }: Props = $props();
</script>

{#each config || [] as item, index ((item as any).id || item.url || index)}
  {#if item.url}
    <MapRasterHandler
      id={`raster-${(item as any).id || (item.url ? btoa(item.url).replace(/=/g, '').slice(-8) : index)}`}
      url={item.url}
      maxZoom={item.maxZoom ?? 7}
      tileSize={item.tileSize ?? 256}
      attribution={item.attribution}
      zIndex={item.zIndex ?? Z_INDEX_BASE_RASTER + index * 0.1}
    />
  {/if}
{/each}
