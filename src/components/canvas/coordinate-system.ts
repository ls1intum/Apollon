import { RefObject } from 'react';
import { Point } from '../../utils/geometry/point';

export class CoordinateSystem {
  get canvas(): HTMLElement {
    return this.ref.current!;
  }

  get container(): HTMLElement {
    return this.canvas.parentElement!;
  }

  constructor(public ref: RefObject<HTMLElement>, public width: number, public height: number) {}

  offset(): Point {
    const bounds = this.container.getBoundingClientRect();
    let x = bounds.left - this.container.scrollLeft;
    let y = bounds.top - this.container.scrollTop;
    x = Math.round(x / 10) * 10;
    y = Math.round(y / 10) * 10;
    return new Point(x, y);
  }

  screenToPoint(x: number, y: number, snap: boolean = true): Point {
    x = x - this.width / 2;
    y = y - this.height / 2;
    if (snap) {
      x = Math.round(x / 10) * 10;
      y = Math.round(y / 10) * 10;
    }
    return new Point(x, y);
  }

  pointToScreen(x: number, y: number): Point {
    x = x + this.width / 2;
    y = y + this.height / 2;
    return new Point(x, y);
  }
}
