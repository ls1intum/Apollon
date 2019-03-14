class Point {
  constructor(public x: number = 0, public y: number = 0) {}

  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Point {
    return new Point(this.x / this.length, this.y / this.length);
  }

  add(x: number, y: number): Point;
  add(x: Point): Point;
  add(x: number | Point, y?: number): Point {
    console.log(x, x instanceof Point);
    if (x instanceof Point) {
      return new Point(this.x + x.x, this.y + x.y);
    }
    if (typeof y == 'number') {
      return new Point(this.x + x, this.y + y);
    }
    return this.clone();
  }

  subtract(point: Point): Point {
    return new Point(this.x - point.x, this.y - point.y);
  }

  scale(factor: number) {
    return new Point(this.x * factor, this.y * factor);
  }

  clone() {
    return new Point(this.x, this.y);
  }
}

export default Point;
