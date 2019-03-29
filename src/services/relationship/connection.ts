import { Direction } from '../../typings';
import { Boundary } from '../../utils/geometry/boundary';
import { Point } from '../../utils/geometry/point';
import { Port } from '../element/port';

export interface Connection {
  source: Port;
  target: Port;
}

interface Endpoint {
  bounds: Boundary;
  direction: Port['direction'];
}

const enum Orientation {
  Collinear,
  Clockwise,
  CounterClockwise,
}

export interface Delta {
  dx: number;
  dy: number;
}

export class Connection {
  static computePath(source: Endpoint, target: Endpoint, options: { isStraight: boolean }): Point[] {
    const startPointOnInnerEdge = Port.position(source.bounds, source.direction).point;
    const endPointOnInnerEdge = Port.position(target.bounds, target.direction).point;

    // If the user forced this relationship path to be a straight line,
    // directly connect the start and end points, even if that results in an angled line
    if (options.isStraight) {
      return [startPointOnInnerEdge, endPointOnInnerEdge];
    }

    const straightPath = Connection.tryFindStraightPath(source, target);

    // If there is a straight path, return that one
    if (straightPath !== null) {
      return straightPath;
    }

    // Each entity has an invisible margin around it (the "crumple zone")
    // in which we try not to place any segments of the relationship path
    const ENTITY_MARGIN = 40;

    // Compute an enlarged version of the source and target rectangles,
    // taking into account the entity margin
    const sourceMarginRect = Connection.enlargeRect(source.bounds, ENTITY_MARGIN);
    const targetMarginRect = Connection.enlargeRect(target.bounds, ENTITY_MARGIN);

    // Do the same computation again, subtracting 1 from the margin so as
    // to allow for path segments to be placed on the outline of the margin rectangle
    const sourceMarginRect1px = Connection.enlargeRect(source.bounds, ENTITY_MARGIN - 1);
    const targetMarginRect1px = Connection.enlargeRect(target.bounds, ENTITY_MARGIN - 1);

    // Calculate the exact position of the start and end points on their respective margin rectangle
    const startPointOnMarginBox = Port.position(sourceMarginRect, source.direction).point;
    const endPointOnMarginBox = Port.position(targetMarginRect, target.direction).point;

    // Determine the source corner that's closest to the point
    // on the margin box of the target entity
    const sourceCornerClosestToEndPoint = Connection.findClosestPoint(Connection.getCorners(sourceMarginRect), endPointOnMarginBox);

    // Determine the target corner that's closest to the previously determined source corner
    const targetCornerClosestToClosestSourceCorner = Connection.findClosestPoint(
      Connection.getCorners(targetMarginRect),
      sourceCornerClosestToEndPoint
    );

    // Determine the corner queue for the source entity
    const sourceCornerQueue = Connection.determineCornerQueue(
      sourceMarginRect,
      source.direction,
      startPointOnMarginBox,
      sourceCornerClosestToEndPoint
    );

    // Determine the corner queue for the target entity
    const targetCornerQueue = Connection.determineCornerQueue(
      targetMarginRect,
      target.direction,
      endPointOnMarginBox,
      targetCornerClosestToClosestSourceCorner
    );

    // The relationship path can be partitioned into two segments:
    // a prefix from the start point and a suffix to the end point
    const pathFromStart = [startPointOnInnerEdge, startPointOnMarginBox];
    const pathFromEnd = [endPointOnInnerEdge, endPointOnMarginBox];

    // We build the relationship path up both from the start and the end
    let currentStartPoint = startPointOnMarginBox;
    let currentEndPoint = endPointOnMarginBox;

    while (true) {
      const startAndEndPointCanBeConnected =
        !Connection.lineSegmentIntersectsRect(currentStartPoint, currentEndPoint, sourceMarginRect1px) &&
        !Connection.lineSegmentIntersectsRect(currentStartPoint, currentEndPoint, targetMarginRect1px);

      // As soon as the current start and end points can be connected with a straight line
      // without intersecting either entity rectangle, we add one or two more points to the relationship path,
      // depending on the axes of the two start/end path segments and exit from the loop
      if (startAndEndPointCanBeConnected) {
        type PathSegment = [Point, Point];
        const currentStartAxis = Connection.getAxisForPathSegment(pathFromStart.slice(-2) as PathSegment);
        const currentEndAxis = Connection.getAxisForPathSegment(pathFromEnd.slice(-2) as PathSegment);

        if (currentStartAxis === 'HORIZONTAL' && currentEndAxis === 'HORIZONTAL') {
          const middleX = (currentStartPoint.x + currentEndPoint.x) / 2;
          pathFromStart.push(new Point(middleX, currentStartPoint.y), new Point(middleX, currentEndPoint.y));
        } else if (currentStartAxis === 'VERTICAL' && currentEndAxis === 'VERTICAL') {
          const middleY = (currentStartPoint.y + currentEndPoint.y) / 2;
          pathFromStart.push(new Point(currentStartPoint.x, middleY), new Point(currentEndPoint.x, middleY));
        } else if (currentStartAxis === 'HORIZONTAL' && currentEndAxis === 'VERTICAL') {
          pathFromStart.push(new Point(currentEndPoint.x, currentStartPoint.y));
        } else {
          pathFromStart.push(new Point(currentStartPoint.x, currentEndPoint.y));
        }

        // We're done here!
        break;
      }

      // We got to this point because the start and end point can't (yet) see each other,
      // thus advance to the next corner of the source entity
      const nextSourceCorner = sourceCornerQueue.shift();

      if (nextSourceCorner !== undefined) {
        pathFromStart.push(nextSourceCorner);
        currentStartPoint = nextSourceCorner;
      } else {
        // The queue of source entity corners is already empty,
        // thus advance to the next corner of the target entity
        const nextTargetCorner = targetCornerQueue.shift();

        if (nextTargetCorner !== undefined) {
          pathFromEnd.push(nextTargetCorner);
          currentEndPoint = nextTargetCorner;
        } else {
          // We've emptied the corner queues of both entities, but the current start and end points
          // still can't be connected with a straight line. This can happen if the two entities
          // are placed closely enough to each other that their margin rectangles intersect.
          // We return a simple (and usually angled) path in this case.
          return [startPointOnInnerEdge, startPointOnMarginBox, endPointOnMarginBox, endPointOnInnerEdge];
        }
      }
    }

    // Compose the entire path
    const pathToEnd = pathFromEnd.reverse();
    const path = [...pathFromStart, ...pathToEnd];

    // Return a beautified version of the relationship path that reduces the number of corners
    // in the relationship path, removes unnecessary points ("transit nodes"), etc.
    return beautifyPath(path);
  }

  private static tryFindStraightPath(source: Endpoint, target: Endpoint): Point[] | null {
    const OVERLAP_THRESHOLD = 40;

    /*
        #######           #######
        # ~~~ # --------> # ~~~ #
        #######           #######
    */
    if (
      source.direction === Direction.Right &&
      target.direction === Direction.Left &&
      target.bounds.x >= source.bounds.x + source.bounds.width
    ) {
      const overlapY = Connection.computeOverlap(
        [source.bounds.y, source.bounds.y + Math.max(OVERLAP_THRESHOLD, source.bounds.height)],
        [target.bounds.y, target.bounds.y + Math.max(OVERLAP_THRESHOLD, target.bounds.height)]
      );

      if (overlapY !== null && overlapY[1] - overlapY[0] >= OVERLAP_THRESHOLD) {
        const middleY = (overlapY[0] + overlapY[1]) / 2;
        const start: Point = new Point(source.bounds.x + source.bounds.width, middleY);
        const end: Point = new Point(target.bounds.x, middleY);
        return [start, end];
      }
    }

    /*
        #######           #######
        # ~~~ # <-------- # ~~~ #
        #######           #######
    */
    if (
      source.direction === Direction.Left &&
      target.direction === Direction.Right &&
      source.bounds.x >= target.bounds.x + target.bounds.width
    ) {
      const overlapY = Connection.computeOverlap(
        [source.bounds.y, source.bounds.y + Math.max(OVERLAP_THRESHOLD, source.bounds.height)],
        [target.bounds.y, target.bounds.y + Math.max(OVERLAP_THRESHOLD, target.bounds.height)]
      );

      if (overlapY !== null && overlapY[1] - overlapY[0] >= OVERLAP_THRESHOLD) {
        const middleY = (overlapY[0] + overlapY[1]) / 2;
        const start: Point = new Point(source.bounds.x, middleY);
        const end: Point = new Point(target.bounds.x + target.bounds.width, middleY);
        return [start, end];
      }
    }

    /*
        #######
        # ~~~ #
        #######
           |
           |
           ∨
        #######
        # ~~~ #
        #######
    */
    if (
      source.direction === Direction.Down &&
      target.direction === Direction.Up &&
      target.bounds.y >= source.bounds.y + source.bounds.height
    ) {
      const overlapX = Connection.computeOverlap(
        [source.bounds.x, source.bounds.x + source.bounds.width],
        [target.bounds.x, target.bounds.x + target.bounds.width]
      );

      if (overlapX !== null && overlapX[1] - overlapX[0] >= OVERLAP_THRESHOLD) {
        const middleX = (overlapX[0] + overlapX[1]) / 2;
        const start: Point = new Point(middleX, source.bounds.y + source.bounds.height);
        const end: Point = new Point(middleX, target.bounds.y);
        return [start, end];
      }
    }

    /*
        #######
        # ~~~ #
        #######
           ∧
           |
           |
        #######
        # ~~~ #
        #######
    */
    if (
      source.direction === Direction.Up &&
      target.direction === Direction.Down &&
      source.bounds.y >= target.bounds.y + target.bounds.height
    ) {
      const overlapX = Connection.computeOverlap(
        [source.bounds.x, source.bounds.x + source.bounds.width],
        [target.bounds.x, target.bounds.x + target.bounds.width]
      );

      if (overlapX !== null && overlapX[1] - overlapX[0] >= OVERLAP_THRESHOLD) {
        const middleX = (overlapX[0] + overlapX[1]) / 2;
        const start: Point = new Point(middleX, source.bounds.y);
        const end: Point = new Point(middleX, target.bounds.y + target.bounds.height);
        return [start, end];
      }
    }

    return null;
  }

  private static computeOverlap(range1: [number, number], range2: [number, number]): [number, number] | null {
    const [from1, to1] = range1;
    const [from2, to2] = range2;

    const largerFrom = Math.max(from1, from2);
    const smallerTo = Math.min(to1, to2);

    return largerFrom <= smallerTo ? [largerFrom, smallerTo] : null;
  }

  private static enlargeRect({ x, y, width, height }: Boundary, padding: number): Boundary {
    return {
      x: x - padding,
      y: y - padding,
      width: width + 2 * padding,
      height: height + 2 * padding,
    };
  }

  private static getCorners({ x, y, width, height }: Boundary): Point[] {
    return [new Point(x, y), new Point(x + width, y), new Point(x, y + height), new Point(x + width, y + height)];
  }

  private static findClosestPoint(candidates: Point[], target: Point) {
    let minDistance = Infinity;
    let closestPoint = candidates[0];

    for (const candidate of candidates) {
      const distance = Connection.distanceBetweenPoints(target, candidate);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = candidate;
      }
    }

    return closestPoint;
  }

  private static distanceBetweenPoints(p1: Point, p2: Point): number {
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    return Math.sqrt(dx ** 2 + dy ** 2);
  }

  private static determineCornerQueue(
    rect: Boundary,
    edge: Port['direction'],
    pointOnOuterEdge: Point,
    destinationCorner: Point | null
  ): Point[] {
    let clockwiseCornerQueue: Point[] = [];
    let counterClockwiseCornerQueue: Point[] = [];

    const [tl, tr, bl, br] = Connection.getCorners(rect);

    // Determine the clockwise and counter-clickwise order of corners
    // when starting at the selected edge of the rectangle
    switch (edge) {
      case Direction.Up:
        clockwiseCornerQueue = [tr, br, bl, tl];
        counterClockwiseCornerQueue = [tl, bl, br, tr];
        break;
      case Direction.Right:
        clockwiseCornerQueue = [br, bl, tl, tr];
        counterClockwiseCornerQueue = [tr, tl, bl, br];
        break;
      case Direction.Down:
        clockwiseCornerQueue = [bl, tl, tr, br];
        counterClockwiseCornerQueue = [br, tr, tl, bl];
        break;
      case Direction.Left:
        clockwiseCornerQueue = [tl, tr, br, bl];
        counterClockwiseCornerQueue = [bl, br, tr, tl];
        break;
    }

    // If we have a destination corner, shorten both corner queues
    // to the prefix that ends with the destination corner
    if (destinationCorner !== null) {
      for (let i = 0; i < 4; i++) {
        if (Connection.pointsAreEqual(clockwiseCornerQueue[i], destinationCorner)) {
          clockwiseCornerQueue = clockwiseCornerQueue.slice(0, i + 1);
          break;
        }
      }

      for (let i = 0; i < 4; i++) {
        if (Connection.pointsAreEqual(counterClockwiseCornerQueue[i], destinationCorner)) {
          counterClockwiseCornerQueue = counterClockwiseCornerQueue.slice(0, i + 1);
          break;
        }
      }
    }

    // Compute the path length for both corner queues
    const clockwisePathLength = Connection.computePathLength([pointOnOuterEdge, ...clockwiseCornerQueue]);
    const counterClockwisePathLength = Connection.computePathLength([pointOnOuterEdge, ...counterClockwiseCornerQueue]);

    // Return the shorter corner queue
    return clockwisePathLength < counterClockwisePathLength ? clockwiseCornerQueue : counterClockwiseCornerQueue;
  }

  private static pointsAreEqual(p: Point, q: Point) {
    const dx = Math.abs(p.x - q.x);
    const dy = Math.abs(p.y - q.y);

    return Connection.isAlmostZero(dx) && Connection.isAlmostZero(dy);
  }

  private static isAlmostZero(value: number) {
    return Math.abs(value) < 1e-6;
  }

  private static computePathLength(path: Point[]): number {
    let pathLength = 0;

    for (let i = 1; i < path.length; i++) {
      pathLength += Connection.distanceBetweenPoints(path[i], path[i - 1]);
    }

    return pathLength;
  }

  private static lineSegmentIntersectsRect(p: Point, q: Point, rect: Boundary) {
    if (Connection.lineSegmentLiesWithinRect(p, q, rect)) {
      return true;
    }

    const [topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner] = Connection.getCorners(rect);

    return (
      Connection.lineSegmentsIntersect(p, q, topLeftCorner, topRightCorner) ||
      Connection.lineSegmentsIntersect(p, q, topRightCorner, bottomRightCorner) ||
      Connection.lineSegmentsIntersect(p, q, topLeftCorner, bottomLeftCorner) ||
      Connection.lineSegmentsIntersect(p, q, bottomLeftCorner, bottomRightCorner)
    );
  }

  private static lineSegmentLiesWithinRect(p: Point, q: Point, rect: Boundary) {
    return p.x > rect.x && p.x < rect.x + rect.height && p.y > rect.y && p.y < rect.y + rect.height;
  }

  private static lineSegmentsIntersect(p1: Point, q1: Point, p2: Point, q2: Point) {
    const o1 = Connection.getOrientation(p1, q1, p2);
    const o2 = Connection.getOrientation(p1, q1, q2);
    const o3 = Connection.getOrientation(p2, q2, p1);
    const o4 = Connection.getOrientation(p2, q2, q1);

    // General case
    if (o1 !== o2 && o3 !== o4) {
      return true;
    }

    // Special Cases
    // p1, q1 and p2 are collinear and p2 lies on segment p1q1
    if (o1 === Orientation.Collinear && Connection.liesOnSegment(p1, p2, q1)) {
      return true;
    }

    // p1, q1 and p2 are collinear and q2 lies on segment p1q1
    if (o2 === Orientation.Collinear && Connection.liesOnSegment(p1, q2, q1)) {
      return true;
    }

    // p2, q2 and p1 are collinear and p1 lies on segment p2q2
    if (o3 === Orientation.Collinear && Connection.liesOnSegment(p2, p1, q2)) {
      return true;
    }

    // p2, q2 and q1 are collinear and q1 lies on segment p2q2
    if (o4 === Orientation.Collinear && Connection.liesOnSegment(p2, q1, q2)) {
      return true;
    }

    // Doesn't fall in any of the above cases
    return false;
  }

  private static getOrientation(p: Point, q: Point, r: Point): Orientation {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);

    if (Connection.isAlmostZero(val)) {
      return Orientation.Collinear;
    }

    return val > 0 ? Orientation.Clockwise : Orientation.CounterClockwise;
  }

  private static liesOnSegment(p: Point, q: Point, r: Point) {
    return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
  }

  private static getAxisForPathSegment(pathSegment: [Point, Point]) {
    // Determine dx and dy
    const [p, q] = pathSegment;
    const dx = q.x - p.x;
    const dy = q.y - p.y;

    // We have a vertical path segment if only dy is non-zero
    if (dx === 0 && dy !== 0) {
      return 'VERTICAL';
    }

    // We have a horizontal path segment if only dx is non-zero
    if (dx !== 0 && dy === 0) {
      return 'HORIZONTAL';
    }

    // We neither have a horizontal nor vertical path segment
    return null;
  }
}

export function beautifyPath(path: Point[]): Point[] {
  if (path.length <= 1) {
    return path;
  }

  path = removeConsecutiveIdenticalPoints(path);
  path = mergeConsecutiveSameAxisDeltas(path);
  path = flattenWaves(path);
  path = removeTransitNodes(path);

  return path;
}

function removeConsecutiveIdenticalPoints(path: Point[]): Point[] {
  const newPath: Point[] = [];
  for (const point of path) {
    const previousPoint = newPath[newPath.length - 1];
    if (!previousPoint || !pointsAreEqual(point, previousPoint)) {
      newPath.push(point);
    }
  }
  return newPath;
}
export function pointsAreEqual(p: Point, q: Point) {
  const dx = Math.abs(p.x - q.x);
  const dy = Math.abs(p.y - q.y);

  return isAlmostZero(dx) && isAlmostZero(dy);
}

export function isAlmostZero(value: number) {
  return Math.abs(value) < 1e-6;
}

function mergeConsecutiveSameAxisDeltas(path: Point[]): Point[] {
  const deltas = computePathDeltas(path);

  if (deltas.length <= 1) {
    return path;
  }

  const newDeltas: Delta[] = [];

  for (const delta of deltas) {
    const previousDelta = newDeltas[newDeltas.length - 1];

    if (!previousDelta) {
      newDeltas.push(delta);
    } else if ((previousDelta.dx === 0 && delta.dx === 0) || (previousDelta.dy === 0 && delta.dy === 0)) {
      newDeltas[newDeltas.length - 1] = {
        dx: previousDelta.dx + delta.dx,
        dy: previousDelta.dy + delta.dy,
      };
    } else {
      newDeltas.push(delta);
    }
  }

  return createPathFromDeltas(path[0], newDeltas);
}

function createPathFromDeltas(start: Point, deltas: Delta[]): Point[] {
  const points = [start];
  let current = start;

  for (const { dx, dy } of deltas) {
    const x = current.x + dx;
    const y = current.y + dy;
    current = new Point(x, y);
    points.push(current);
  }

  return points;
}

function computePathDeltas(path: Point[]): Delta[] {
  const deltas: Delta[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i];
    const q = path[i + 1];

    const dx = q.x - p.x;
    const dy = q.y - p.y;

    deltas.push({ dx, dy });
  }

  return deltas;
}

/**
 * Simplifies W-shaped path segments.
 *
 * e.g.
 *
 * O----O                0---------0
 *      |                          |
 *      O----O    ==>              0
 *           |                     |
 *           0                     0
 */
function flattenWaves(path: Point[]): Point[] {
  if (path.length < 4) {
    return path;
  }

  const deltas = computePathDeltas(path);
  const simplifiedDeltas = simplifyDeltas(deltas);

  const start = path[0];
  const simplifiedPath = createPathFromDeltas(start, simplifiedDeltas);

  return simplifiedPath;
}

function simplifyDeltas(deltas: Delta[]): Delta[] {
  for (let i = 0; i < deltas.length - 3; i++) {
    const d1 = deltas[i];
    const d2 = deltas[i + 1];
    const d3 = deltas[i + 2];
    const d4 = deltas[i + 3];

    if (d1.dy === 0 && d2.dx === 0 && d3.dy === 0 && Math.sign(d1.dx) === Math.sign(d3.dx) && Math.sign(d2.dy) === Math.sign(d4.dy)) {
      return simplifyDeltas([...deltas.slice(0, i), { dx: d1.dx + d3.dx, dy: 0 }, { dx: 0, dy: d2.dy }, ...deltas.slice(i + 3)]);
    }

    if (d1.dx === 0 && d2.dy === 0 && d3.dx === 0 && Math.sign(d1.dy) === Math.sign(d3.dy) && Math.sign(d2.dx) === Math.sign(d4.dx)) {
      return simplifyDeltas([...deltas.slice(0, i), { dx: 0, dy: d1.dy + d3.dy }, { dx: d2.dx, dy: 0 }, ...deltas.slice(i + 3)]);
    }
  }

  return deltas;
}

function removeTransitNodes(path: Point[]): Point[] {
  for (let i = 0; i < path.length - 2; i++) {
    const p = path[i];
    const q = path[i + 1];
    const r = path[i + 2];

    if (isHorizontalLineSegment(p, q, r) || isVerticalLineSegment(p, q, r)) {
      const pointsBeforeQ = path.slice(0, i + 1);
      const pointsAfterQ = path.slice(i + 2);
      const pathWithoutQ = [...pointsBeforeQ, ...pointsAfterQ];

      return removeTransitNodes(pathWithoutQ);
    }
  }

  return path;
}

function isHorizontalLineSegment(p: Point, q: Point, r: Point) {
  return areAlmostEqual(p.y, q.y) && areAlmostEqual(q.y, r.y) && ((p.x >= q.x && q.x >= r.x) || (p.x <= q.x && q.x <= r.x));
}

function isVerticalLineSegment(p: Point, q: Point, r: Point) {
  return areAlmostEqual(p.x, q.x) && areAlmostEqual(q.x, r.x) && ((p.y <= q.y && q.y <= r.y) || (p.y >= q.y && q.y >= r.y));
}

export function areAlmostEqual(a: number, b: number) {
  return isAlmostZero(a - b);
}
