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
- **Options Reactivity & Hash Sync**: When updating, reordering, or closing layer modals in [PropLayers.svelte](../../src/components/Builder/Layers/PropLayers.svelte), ensure changes are committed to `$options` and deeply re-assigned using `$options = $state.snapshot($options)`. This cleanly unproxies and clones all nested item references so Svelte 5 fine-grained reactivity detects the changes across child map handlers and ACTO marker URL hash encoders without manual array/object mapping.
- **CMID Form Inputs**: Never use `type="number"` for CMID fields (avoids spin button increment arrows). Always use `type="text"` with `inputmode="numeric"` and `pattern="[0-9]*"`.
- **URL Templates in Markup**: Pass string attributes with literal curly braces (such as `{z}/{x}/{y}`) as JavaScript string expressions (`placeholder={'https://.../{z}/{x}/{y}.png'}`) to avoid Svelte template parsing errors.
- **Builder Component Library (`@abcnews/components-builder`)**: Always use standard components from `@abcnews/components-builder` (such as `Modal`, `Typeahead`, `Loader`, `BuilderFrame`, `BuilderStyleRoot`) for builder modals, multi-select search dropdowns, and controls rather than reinventing bespoke UI primitives. Adhere to established patterns like `<Modal position="right" title="..." onClose={...} {footerChildren}>` with standard `<button>` elements.


