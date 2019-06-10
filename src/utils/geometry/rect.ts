import { Direction } from '../../services/uml-element/uml-element-port';
import { Boundary } from './boundary';
import { Point } from './point';

export function position(bounds: Boundary, direction: Direction, scale: number = 0.5): { point: Point; offset: Point } {
  const { x, y, width, height } = bounds;
  const offset = 40;
  switch (direction) {
    case Direction.Up:
      return {
        point: new Point(x + width * scale, y),
        offset: new Point(x + width * scale, y - offset),
      };
    case Direction.Right:
      return {
        point: new Point(x + width, y + height * scale),
        offset: new Point(x + width + offset, y + height * scale),
      };
    case Direction.Down:
      return {
        point: new Point(x + width * scale, y + height),
        offset: new Point(x + width * scale, y + height + offset),
      };
    case Direction.Left:
      return {
        point: new Point(x, y + height * scale),
        offset: new Point(x - offset, y + height * scale),
      };
  }
}
