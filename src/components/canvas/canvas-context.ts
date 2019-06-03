import { createContext } from 'react';
import { Point } from '../../utils/geometry/point';
import { CoordinateSystem } from './coordinate-system';

export const context: CoordinateSystem = {
  origin: () => new Point(),
  snap: (point: Point) => point.round(),
};

export const { Consumer: CanvasConsumer, Provider: CanvasProvider } = createContext<CoordinateSystem>(context);
