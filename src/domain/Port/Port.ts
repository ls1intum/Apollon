import Boundary from '../geo/Boundary';
import { Location } from '../../ApollonEditor';

interface Port {
  element: string;
  location: Location;
}

class Port {
  static position(
    bounds: Boundary,
    location: Port['location']
  ): { point: { x: number; y: number }; offset: { x: number; y: number } } {
    let { x, y, width, height } = bounds;
    const offset = 40;
    switch (location) {
      case Location.North:
        return {
          point: { x: x + width / 2, y },
          offset: { x: x + width / 2, y: y - offset },
        };
      case Location.East:
        return {
          point: { x: x + width, y: y + height / 2 },
          offset: { x: x + width + offset, y: y + height / 2 },
        };
      case Location.South:
        return {
          point: { x: x + width / 2, y: y + height },
          offset: { x: x + width / 2, y: y + height + offset },
        };
      case Location.West:
        return {
          point: { x, y: y + height / 2 },
          offset: { x: x - offset, y: y + height / 2 },
        };
    }
  }
}

export default Port;
