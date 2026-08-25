<script lang="ts">
  import type { IconConfig } from '../../../lib/marker';
  import { Z_INDEX_CUSTOM_LABELS } from '../layers/layerUtils.ts';
  import IconHandler from './IconHandler.svelte';

  let { config = [] }: { config?: IconConfig[] } = $props();
</script>

{#each config as item, index (item.id || `${item.cmid}-${index}`)}
  <IconHandler
    config={item}
    id={item.id || `${item.cmid}-${index}`}
    zIndex={item.zIndex ?? Z_INDEX_CUSTOM_LABELS + index * 0.1}
  />
{/each}
