# GeoJSON Architecture & Styling System

This document outlines the architecture of the GeoJSON styling system, focusing on the multi-style implementation, theme presets, and MapLibre `setFeatureState` architecture.

## Overview

The GeoJSON system is designed to handle multiple, prioritised styling rules for a single data source. Rather than building and recompiling complex MapLibre AST expression trees for every state update, the system uses fast JavaScript style evaluators to compute per-feature style objects and updates them dynamically via MapLibre's `setFeatureState` API.

This enables smooth GPU-accelerated transitions (including fade-ins from 0 to target opacity on load) and unified styling logic shared between 2D MapLibre layers and 3D Three.js Spikes.

## Core Components

### 1. Data Models (`src/lib/marker/types.ts`)

- **`GeoJsonConfig`**: The root configuration for a GeoJSON layer. It contains a `cmid` (CoreMedia ID), a `type` (points, lines, areas, spikes), and an array of `styles`.
- **`GeoJsonStyleConfig`**: A single styling rule.
  - `filter`: Optional property-based filter (e.g., `status == "hit"`).
  - `colourMode`: `simple`, `scale`, or `basic`.
  - `colourConfig`: Specific parameters for the chosen mode, including `basicType` for presets.

### 2. Centralised Themes (`src/components/CustomGlobe/features/GeoJson/themes.ts`)

The `THEMES` object is the single source of truth for visual presets:

- **`normal`**: The default ABC-branded style.
- **`highlighted`**: A high-visibility "red" style with increased stroke and radius.

### 3. Feature State Evaluation (`src/components/CustomGlobe/features/GeoJson/utils.ts`)

- `getFeatureStateEvaluator(config)`: Builds a fast JS evaluator function returning the complete styling state for any given feature:
  `{ color, fillColor, strokeColor, outlineColor, radius, strokeWidth, outlineWidth, opacity, fillOpacity, strokeOpacity }`
- `applyFeatureStates(map, sourceId, data, config, overrideOpacity)`: Iterates over the features in a GeoJSON dataset and commits their calculated styles directly into MapLibre's feature-state registry.

### 4. Layer Renderers

- `RenderPoint.svelte`: Circle layer referencing `['feature-state', ...]` properties with 300ms transition curves.
- `RenderLine.svelte`: Main stroke and outline line layers referencing `['feature-state', ...]` properties.
- `RenderArea.svelte`: Fill and outline layers referencing `['feature-state', ...]` properties.

## Styling Lifecycle & Transitions

1. **Initial Load**:
   - `GeoJsonHandler.svelte` fetches the GeoJSON/TopoJSON dataset and ensures each feature has a stable `id`.
   - The renderer mounts the MapLibre source and layers with static `feature-state` bindings and transition durations.
   - `applyFeatureStates(..., 0)` sets initial feature states with opacity `0`.
   - On the next animation frame, `applyFeatureStates(...)` pushes the computed target style values, triggering a smooth 300ms GPU transition from 0 to 100% opacity.
2. **Dynamic Updates**:
   - Whenever `config` changes in the Builder (e.g. colour presets, filter changes, opacity sliders), `applyFeatureStates(...)` recomputes and pushes new states, smoothly transitioning on the globe.

## Testing & Verification

Unit tests are located in `src/components/CustomGlobe/features/GeoJson/utils.test.ts`.
