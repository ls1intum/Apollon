import { Point } from '../../utils/geometry/point';

export type CoordinateSystem = {
  origin(): Point;
  snap(point: Point): Point;
};
