import { Direction } from '../../services/uml-element/uml-element-port';
import { IBoundary } from './boundary';
import { Point } from './point';

export function position(bounds: IBoundary, direction: Direction): { point: Point; offset: Point } {
  const { x, y, width, height } = bounds;
  const offset = 40;
  switch (direction) {
    case Direction.Up:
      return {
        point: new Point(x + width, y),
        offset: new Point(x + width, y - offset),
      };
    case Direction.Right:
      return {
        point: new Point(x + width, y + height),
        offset: new Point(x + width + offset, y + height),
      };
    case Direction.Down:
      return {
        point: new Point(x + width, y + height),
        offset: new Point(x + width, y + height + offset),
      };
    case Direction.Left:
      return {
        point: new Point(x, y + height),
        offset: new Point(x - offset, y + height),
      };
  }
}
