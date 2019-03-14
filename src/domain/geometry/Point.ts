class Point {
  constructor(public x: number, public y: number) {}

  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Point {
    return new Point(this.x / this.length, this.y / this.length);
  }

  add(point: Point): Point {
    return new Point(this.x + point.x, this.y + point.y);
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
