export enum Direction {
  Up = 'Up',
  Right = 'Right',
  Down = 'Down',
  Left = 'Left',
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
    default:
      throw Error(`Could not determine opposite direction for direction of ${direction}`);
  }
}
