export enum Direction {
  Up = 'Up',
  Right = 'Right',
  Down = 'Down',
  Left = 'Left',
  Upright = 'Upright',
  Upleft = 'Upleft',
  Downright = 'Downright',
  Downleft = 'Downleft',
  Topright = 'Topright',
  Topleft = 'Topleft',
  Bottomright = 'Bottomright',
  Bottomleft = 'Bottomleft',
}

export interface IUMLElementPort {
  element: string;
  direction: Direction;
}

export function getOppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case Direction.Down:
      return Direction.Up;
    case Direction.Left:
      return Direction.Right;
    case Direction.Right:
      return Direction.Left;
    case Direction.Up:
      return Direction.Down;
    case Direction.Upright:
      return Direction.Upleft;
    case Direction.Downright:
      return Direction.Downleft;
    case Direction.Upleft:
      return Direction.Upright;
    case Direction.Downleft:
      return Direction.Downright;
    case Direction.Topright:
      return Direction.Topleft;
    case Direction.Bottomright:
      return Direction.Bottomleft;
    case Direction.Topleft:
      return Direction.Topright;
    case Direction.Bottomleft:
      return Direction.Bottomright;
    default:
      throw Error(`Could not determine opposite direction for direction of ${direction}`);
  }
}
