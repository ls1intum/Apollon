import { IPoint, Point } from './point';

export interface IBoundary {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute a bounding box for a set of points
 * @param points The points that should be contained within the bounding box
 */
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

/**
 * Calculate the bounding box for a set of elements
 * @param elements The elements for which a common bounding box should be calculated
 */
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

/**
 * Check whether a given element is intersected by a boundary. This method is used for checking if an element is
 * intersected.
 *
 * @param bounds The bounds for which intersection by the intersecting boundaries is determined
 * @param intersectingBounds The potentially intersecting bounds
 */
export const areBoundsIntersecting = (bounds: IBoundary, intersectingBounds: IBoundary): boolean => {
  const cornerPoints: IPoint[] = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ];

  const intersectingBoundsStartX = Math.min(intersectingBounds.x, intersectingBounds.x + intersectingBounds.width);
  const intersectingBoundsEndX = Math.max(intersectingBounds.x, intersectingBounds.x + intersectingBounds.width);
  const intersectingBoundsStartY = Math.min(intersectingBounds.y, intersectingBounds.y + intersectingBounds.height);
  const intersectingBoundsEndY = Math.max(intersectingBounds.y, intersectingBounds.y + intersectingBounds.height);

  // Determine if the given bounds are at least partially contained within the intersecting bounds
  return cornerPoints.some(
    (point) =>
      intersectingBoundsStartX <= point.x &&
      point.x <= intersectingBoundsEndX &&
      intersectingBoundsStartY <= point.y &&
      point.y <= intersectingBoundsEndY,
  );
};
