import type { PanelDefinition } from '@abcnews/svelte-scrollyteller';
import type { DecodedObject } from '../../../lib/marker';

export interface ViewState {
  center: [number, number];
  zoom: number;
}

/** Van Wijk & Nuij viewport state: [ux, uy, w] */
export type ZoomPoint = [number, number, number];

export type FitMode = 'fit' | 'fill';

export interface PanZoomProps {
  coords?: [number, number];
  bounds?: [number, number][];
  z?: number;
  fitGlobe?: boolean;
  constrainView?: boolean;
  animationDuration?: number;
}

export interface PanZoomScrollProps {
  /** Array of scrollyteller panels */
  panels: PanelDefinition<DecodedObject>[];
  /** Currently active panel index */
  currentPanel: number;
  /** Virtual panel index including prelude (-1) and outro (N) */
  virtualPanel?: number;
  /** Progress through the active panel (0.0 to 1.0) */
  panelPct: number;
}



