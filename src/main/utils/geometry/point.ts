export interface IPoint {
  x: number;
  y: number;
}

export class Point implements IPoint {
  constructor(
    public x: number = 0,
    public y: number = 0,
  ) {}

  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Point {
    return new Point(this.x / this.length, this.y / this.length);
  }

  add(x: number, y: number): Point;
  add(x: Point): Point;
  add(x: number | Point, y?: number): Point {
    if (x instanceof Point) {
      return new Point(this.x + x.x, this.y + x.y);
    }
    if (typeof y === 'number') {
      return new Point(this.x + x, this.y + y);
    }
    return this.clone();
  }

  subtract(x: number, y: number): Point;
  subtract(x: Point): Point;
  subtract(x: number | Point, y?: number): Point {
    if (x instanceof Point) {
      return new Point(this.x - x.x, this.y - x.y);
    }
    if (typeof y === 'number') {
      return new Point(this.x - x, this.y - y);
    }
    return this.clone();
  }

  round(radix: number = 10): Point {
    return new Point(Math.round(this.x / radix) * radix, Math.round(this.y / radix) * radix);
  }

  scale(factor: number) {
    return new Point(this.x * factor, this.y * factor);
  }

  clone() {
    return new Point(this.x, this.y);
  }
}
