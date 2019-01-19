import { RefObject } from 'react';

class CoordinateSystem {
  get canvas(): HTMLElement {
    return this.ref.current!;
  }

  get container(): HTMLElement {
    return this.canvas.parentElement!;
  }

  constructor(
    public ref: RefObject<HTMLElement>,
    public width: number,
    public height: number
  ) {}

  offset() {
    const bounds = this.container.getBoundingClientRect();
    let x = bounds.left - this.container.scrollLeft;
    let y = bounds.top - this.container.scrollTop;
    x = Math.round(x / 10) * 10;
    y = Math.round(y / 10) * 10;
    return { x, y };
  }

  screenToPoint(x: number, y: number, snap: boolean = true) {
    x = x - this.width / 2;
    y = y - this.height / 2;
    if (snap) {
      x = Math.round(x / 10) * 10;
      y = Math.round(y / 10) * 10;
    }
    return { x, y };
  }

  pointToScreen(x: number, y: number) {
    x = x + this.width / 2;
    y = y + this.height / 2;
    return { x, y };
  }
}

export default CoordinateSystem;
