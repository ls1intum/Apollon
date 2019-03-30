import { Direction } from '../../typings';
import { Boundary } from '../../utils/geometry/boundary';
import { Point } from '../../utils/geometry/point';

export interface Port {
  element: string;
  direction: Direction;
}

export class Port {
  static position(bounds: Boundary, direction: Direction): { point: Point; offset: Point } {
    const { x, y, width, height } = bounds;
    const offset = 40;
    switch (direction) {
      case Direction.Up:
        return {
          point: new Point(x + width / 2, y),
          offset: new Point(x + width / 2, y - offset),
        };
      case Direction.Right:
        return {
          point: new Point(x + width, y + height / 2),
          offset: new Point(x + width + offset, y + height / 2),
        };
      case Direction.Down:
        return {
          point: new Point(x + width / 2, y + height),
          offset: new Point(x + width / 2, y + height + offset),
        };
      case Direction.Left:
        return {
          point: new Point(x, y + height / 2),
          offset: new Point(x - offset, y + height / 2),
        };
    }
  }
}
