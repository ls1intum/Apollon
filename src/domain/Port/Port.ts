import Boundary from '../geo/Boundary';
import { Direction } from '../..';

interface Port {
  element: string;
  direction: Direction;
}

class Port {
  static position(
    bounds: Boundary,
    direction: Port['direction']
  ): { point: { x: number; y: number }; offset: { x: number; y: number } } {
    let { x, y, width, height } = bounds;
    const offset = 40;
    switch (direction) {
      case Direction.Up:
        return {
          point: { x: x + width / 2, y },
          offset: { x: x + width / 2, y: y - offset },
        };
      case Direction.Right:
        return {
          point: { x: x + width, y: y + height / 2 },
          offset: { x: x + width + offset, y: y + height / 2 },
        };
      case Direction.Down:
        return {
          point: { x: x + width / 2, y: y + height },
          offset: { x: x + width / 2, y: y + height + offset },
        };
      case Direction.Left:
        return {
          point: { x, y: y + height / 2 },
          offset: { x: x - offset, y: y + height / 2 },
        };
    }
  }
}

export default Port;
