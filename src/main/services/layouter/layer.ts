import { Point } from '../../utils/geometry/point';

export interface ILayer {
  layer: SVGSVGElement;
  origin(): Point;
}
