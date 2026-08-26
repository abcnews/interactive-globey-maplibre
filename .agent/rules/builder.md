---
trigger: always_on
---

We have these variables available to us:
--text: #ccc;
--text-light: #888;
--background: #1a1a1a;
--background-alt: #2c2c2f;
--border: rgba(122, 123, 135, 0.5);

## Builder Best Practices

For the complete feature implementation guide, see [src/components/features/README.md](../../src/components/features/README.md).

- **Svelte 5 `$bindable()` Props**: Always define props using `let { config = $bindable(), onclose }: Props = $props()`. Never rename `$bindable()` props during destructuring (e.g. `config: initialConfig = $bindable()`), as this breaks two-way binding back to the parent component.
- **Modal State & Drafts**: If using a local draft for in-modal editing, keep a separate `$state` variable (e.g. `draftConfig = $state(...)`) and directly mutate/assign saved properties onto the bound `config` prop on save before invoking `onclose()`.
- **Options Reactivity & Hash Sync**: When updating or closing layer modals in [PropLayers.svelte](../../src/components/Builder/Layers/PropLayers.svelte), ensure the saved layer object is written into the corresponding `options` array (`options.geoJson`, `options.icons`, `options.imageSources`) and reassign `options` (`options = { ...options, ... }`) to trigger ACTO marker hash re-encoding.
- **CMID Form Inputs**: Never use `type="number"` for CMID fields (avoids spin button increment arrows). Always use `type="text"` with `inputmode="numeric"` and `pattern="[0-9]*"`.
- **URL Templates in Markup**: Pass string attributes with literal curly braces (such as `{z}/{x}/{y}`) as JavaScript string expressions (`placeholder={'https://.../{z}/{x}/{y}.png'}`) to avoid Svelte template parsing errors.

