import { IPoint, Point } from './point';

export type IPath = [IPoint, IPoint, ...IPoint[]];

export class Path {
  constructor(public path: IPath = [new Point(), new Point()]) {}

  get length(): number {
    return this.path
      .map(point => new Point(point.x, point.y))
      .reduce(
        (length, point, i, points) => (i + 1 < points.length ? length + points[i + 1].subtract(point).length : length),
        0,
      );
  }

  position(distance: number = 0): IPoint {
    const v = {
      x: this.path[1].x - this.path[0].x,
      y: this.path[1].y - this.path[0].y,
    };
    const length = Math.sqrt(v.x * v.x + v.y * v.y);
    const u = { x: v.x / length, y: v.y / length };
    const pointOne = new Point(this.path[0].x + distance * u.x, this.path[0].y + distance * u.y);
    return pointOne;
  }
}
