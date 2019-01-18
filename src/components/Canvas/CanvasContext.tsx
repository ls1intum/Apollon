import React, { SFC, createContext, ComponentType } from 'react';
import hoistStatics from 'hoist-non-react-statics';
import CoordinateSystem from './CoordinateSystem';

export interface CanvasContext {
  canvas: HTMLDivElement;
  coordinateSystem: CoordinateSystem;
}

export const {
  Consumer: CanvasConsumer,
  Provider: CanvasProvider,
} = createContext<CanvasContext | null>(null);

export const withCanvas = <Props extends object>(Component: ComponentType<Props & CanvasContext>) => {
  const C: SFC<Props> = (props) => (
    <CanvasConsumer children={context => context && <Component {...props} {...context} />} />
  );

  C.displayName = `withCanvas(${Component.displayName || Component.name})`;

  return hoistStatics(C, Component);
}

export default CanvasContext;
