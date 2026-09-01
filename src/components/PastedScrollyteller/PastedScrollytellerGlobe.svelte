<script lang="ts">
  import { markerSchema, type DecodedObject } from '../../lib/marker';
  import ScrollytellerGlobe from '../ScrollytellerGlobe/ScrollytellerGlobe.svelte';
  import type { PanelDefinition } from '@abcnews/svelte-scrollyteller';
  import { Loader } from '@abcnews/components-builder';

  interface Props {
    /** Scrollyteller panels as parsed from the pasted content */
    panels: PanelDefinition<any>[];
    /** Callback when a marker becomes active */
    onMarker?: (data: any) => void;
  }

  let { panels, onMarker }: Props = $props();

  let decodedPanels = $state<PanelDefinition<DecodedObject>[] | null>(null);

  $effect(() => {
    if (!panels || panels.length === 0) {
      decodedPanels = [];
      return;
    }

    Promise.all(
      panels.map(async panel => ({
        ...panel,
        data: {
          ...(await markerSchema.decode(panel.data)),
          _name: panel.nodes[0]?.textContent || '',
          originalData: panel.data
        }
      }))
    ).then(res => {
      decodedPanels = res;
      if (res.length > 0 && onMarker) {
        onMarker(res[0].data);
      }
    });
  });
</script>

{#if decodedPanels}
  <ScrollytellerGlobe panels={decodedPanels} {onMarker} />
{:else}
  <Loader />
{/if}
