import { createContext } from 'react';
import { ILayer } from '../../services/layouter/layer';

export type CanvasContext = {
  canvas: ILayer;
};

export const { Consumer: CanvasConsumer, Provider: CanvasProvider } = createContext<CanvasContext | null>(null);
