export interface ViewState {
  center: [number, number];
  zoom: number;
}

export type FitMode = 'fit' | 'fill';

export interface PanZoomProps {
  coords?: [number, number];
  bounds?: [number, number][];
  z?: number;
  fitGlobe?: boolean;
  constrainView?: boolean;
  animationDuration?: number;
}
