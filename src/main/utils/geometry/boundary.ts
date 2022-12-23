import { Point } from './point';

export interface IBoundary {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeBoundingBox(points: Point[]): IBoundary {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const firstPoint = points[0];

  let minX = firstPoint.x;
  let minY = firstPoint.y;

  let maxX = firstPoint.x;
  let maxY = firstPoint.y;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;

    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function computeBoundingBoxForElements(elements: { bounds: IBoundary }[]): IBoundary {
  if (!elements.length) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const boundaries: IBoundary[] = elements.map<IBoundary>((element) => ({ ...element.bounds }));
  const x = Math.min(...boundaries.map((bounds) => bounds.x));
  const y = Math.min(...boundaries.map((bounds) => bounds.y));
  const width = Math.max(...boundaries.map((bounds) => bounds.x + bounds.width)) - x;
  const height = Math.max(...boundaries.map((bounds) => bounds.y + bounds.height)) - y;
  return { x, y, width, height };
}

export function computeDimension(scale: number, value: number, isCircle?: boolean): number {
  if (isCircle && scale === 1) {
    return value * scale;
  } else {
    return Math.round((value * scale) / 10) * 10;
  }
}
