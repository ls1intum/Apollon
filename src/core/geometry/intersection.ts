import { isAlmostZero } from "./math/floatingPoint";
import { Point } from "./point";
import {
    getBottomLeftCorner,
    getBottomRightCorner,
    getTopLeftCorner,
    getTopRightCorner,
    Rect
} from "./rect";

export function lineSegmentIntersectsRect(p: Point, q: Point, rect: Rect) {
    if (lineSegmentLiesWithinRect(p, q, rect)) {
        return true;
    }

    const topLeftCorner = getTopLeftCorner(rect);
    const topRightCorner = getTopRightCorner(rect);
    const bottomLeftCorner = getBottomLeftCorner(rect);
    const bottomRightCorner = getBottomRightCorner(rect);

    return (
        lineSegmentsIntersect(p, q, topLeftCorner, topRightCorner) ||
        lineSegmentsIntersect(p, q, topRightCorner, bottomRightCorner) ||
        lineSegmentsIntersect(p, q, topLeftCorner, bottomLeftCorner) ||
        lineSegmentsIntersect(p, q, bottomLeftCorner, bottomRightCorner)
    );
}

/**
 * Determines whether the given line lies entirely within the given rectangle.
 */
function lineSegmentLiesWithinRect(p: Point, q: Point, rect: Rect) {
    return p.x > rect.x && p.x < rect.x + rect.height && p.y > rect.y && p.y < rect.y + rect.height;
}

// Adapted from http://www.geeksforgeeks.org/check-if-two-given-line-segments-intersect/
function lineSegmentsIntersect(p1: Point, q1: Point, p2: Point, q2: Point) {
    const o1 = getOrientation(p1, q1, p2);
    const o2 = getOrientation(p1, q1, q2);
    const o3 = getOrientation(p2, q2, p1);
    const o4 = getOrientation(p2, q2, q1);

    // General case
    if (o1 !== o2 && o3 !== o4) {
        return true;
    }

    // Special Cases
    // p1, q1 and p2 are colinear and p2 lies on segment p1q1
    if (o1 === Orientation.Collinear && liesOnSegment(p1, p2, q1)) {
        return true;
    }

    // p1, q1 and p2 are colinear and q2 lies on segment p1q1
    if (o2 === Orientation.Collinear && liesOnSegment(p1, q2, q1)) {
        return true;
    }

    // p2, q2 and p1 are colinear and p1 lies on segment p2q2
    if (o3 === Orientation.Collinear && liesOnSegment(p2, p1, q2)) {
        return true;
    }

    // p2, q2 and q1 are colinear and q1 lies on segment p2q2
    if (o4 === Orientation.Collinear && liesOnSegment(p2, q1, q2)) {
        return true;
    }

    // Doesn't fall in any of the above cases
    return false;
}

const enum Orientation {
    Collinear,
    Clockwise,
    CounterClockwise
}

function getOrientation(p: Point, q: Point, r: Point): Orientation {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);

    if (isAlmostZero(val)) {
        return Orientation.Collinear;
    }

    return val > 0 ? Orientation.Clockwise : Orientation.CounterClockwise;
}

/**
 * Given three colinear points p, q, r, checks if point q lies on line segment 'p-r'
 */
function liesOnSegment(p: Point, q: Point, r: Point) {
    return (
        q.x <= Math.max(p.x, r.x) &&
        q.x >= Math.min(p.x, r.x) &&
        q.y <= Math.max(p.y, r.y) &&
        q.y >= Math.min(p.y, r.y)
    );
}
