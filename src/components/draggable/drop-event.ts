import { Point } from '../../utils/geometry/point';

export type DropEvent = {
  owner?: string;
  position: Point;
};
