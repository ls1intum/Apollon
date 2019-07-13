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
