import { createContext, createRef, RefObject } from 'react';
import { CoordinateSystem } from './coordinate-system';

export type CanvasContext = {
  canvas: RefObject<CoordinateSystem>;
};

export const { Consumer: CanvasConsumer, Provider: CanvasProvider } = createContext<CanvasContext>({
  canvas: createRef(),
});
