import { Point } from '../../utils/geometry/point';

export interface CoordinateSystem {
  origin(): Point;
  snap(point: Point): Point;
}
