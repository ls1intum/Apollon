import { RefObject } from 'react';
import { Point } from '../../utils/geometry/point';

export class CoordinateSystem {
  constructor(public layer: RefObject<SVGSVGElement>) {}

  offset(snap: boolean = true): Point {
    const layerBounds = this.layer.current!.getBoundingClientRect();
    let x = layerBounds.left;
    let y = layerBounds.top;
    if (snap) {
      x = Math.round(x / 10) * 10;
      y = Math.round(y / 10) * 10;
    }
    return new Point(x, y);
  }

  screenToPoint(x: number, y: number, snap: boolean = true): Point {
    if (snap) {
      x = Math.round(x / 10) * 10;
      y = Math.round(y / 10) * 10;
    }
    return new Point(x, y);
  }

  pointToScreen(x: number, y: number): Point {
    return new Point(x, y);
  }
}
