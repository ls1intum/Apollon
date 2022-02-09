import { Point } from '../../utils/geometry/point.js';

export type DropEvent = {
  owner?: string;
  position: Point;
};
