Searched web: ""maplibre" "setFeatureState" transition "paint""

In MapLibre GL JS, **native paint property transitions (`*-transition`) do not work with `setFeatureState`**.

### Why Native Transitions Don't Work With `setFeatureState`

1. **Architecture Limitation**: MapLibre's native transition system operates strictly on **layer-level constant paint properties** via global shader time uniforms (`u_opacity`, `u_color_t`, etc.).
2. **`feature-state` is a per-frame texture lookup**: Expressions like `['feature-state', 'fillColor']` are evaluated on the GPU per-vertex/per-fragment from a state texture. MapLibre does not allocate per-feature timestamp buffers or previous-state history in WebGL.
3. **Instant Evaluation**: Whenever `setFeatureState` is called, MapLibre updates the texture entry and the shader immediately renders the new value on the next frame with no interpolation.

---

### How to Achieve Transitions in MapLibre

Depending on what needs to transition, here are the architectural options:

#### Option 1: Native MapLibre Layer-Level Fade (For 0 → 100% Opacity on Load)

If per-feature colours/radii come from `setFeatureState`, but you want the entire GeoJSON layer to **transition in from 0% to 100% opacity natively on load**:

- Set `fill-opacity`, `line-opacity`, or `circle-opacity` as a layer-level constant paint property:
  ```ts
  paint: {
    'fill-color': ['coalesce', ['feature-state', 'fillColor'], '#00267e'],
    'fill-opacity': 0,
    'fill-opacity-transition': { duration: 300 }
  }
  ```
- After adding the layer, calling `map.setPaintProperty(layerId, 'fill-opacity', 1)` triggers MapLibre's **native GPU transition engine** without `requestAnimationFrame`.

#### Option 2: Per-Feature Colour & Opacity Transitions

If individual features must change colours or opacities independently over time (e.g. individual items changing colours when filters change):

- Because MapLibre shaders lack per-feature time uniforms, this requires either:
  1. An animation loop (`requestAnimationFrame`) to interpolate values into `setFeatureState`, or
  2. A custom WebGL / Three.js layer (like `RenderSpikeInner.svelte`).

---

Would you like to configure **Option 1** (layer-level `setPaintProperty` for native 0 → 100% GPU fade-in on load while using `setFeatureState` for individual feature colours)?
