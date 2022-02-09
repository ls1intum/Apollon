import { Point } from '../../utils/geometry/point.js';

export interface ILayer {
  layer: SVGSVGElement;
  origin(): Point;
}
