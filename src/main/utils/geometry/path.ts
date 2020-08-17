import { IPoint, Point } from './point';

export type IPath = [IPoint, IPoint, ...IPoint[]];

export class Path {
  constructor(public path: IPath = [new Point(), new Point()]) {}

  get length(): number {
    return this.path
      .map((point) => new Point(point.x, point.y))
      .reduce(
        (length, point, i, points) => (i + 1 < points.length ? length + points[i + 1].subtract(point).length : length),
        0,
      );
  }

  position(distance: number = 0): Point {
    for (let index = 0; index < this.path.length - 1; index++) {
      const current = new Point(this.path[index + 1].x, this.path[index + 1].y);
      const next = new Point(this.path[index].x, this.path[index].y);
      const vector = current.subtract(next);
      if (vector.length > distance) {
        const norm = vector.normalize();
        return next.add(norm.scale(distance));
      }
      distance -= vector.length;
    }
    return new Point();
  }
}
