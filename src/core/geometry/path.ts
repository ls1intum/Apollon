import { Delta } from "./delta";
import { areAlmostEqual } from "./math/floatingPoint";
import { Point, pointsAreEqual } from "./point";

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
    return (
        areAlmostEqual(p.y, q.y) &&
        areAlmostEqual(q.y, r.y) &&
        ((p.x >= q.x && q.x >= r.x) || (p.x <= q.x && q.x <= r.x))
    );
}

function isVerticalLineSegment(p: Point, q: Point, r: Point) {
    return (
        areAlmostEqual(p.x, q.x) &&
        areAlmostEqual(q.x, r.x) &&
        ((p.y <= q.y && q.y <= r.y) || (p.y >= q.y && q.y >= r.y))
    );
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
        } else if (
            (previousDelta.dx === 0 && delta.dx === 0) ||
            (previousDelta.dy === 0 && delta.dy === 0)
        ) {
            newDeltas[newDeltas.length - 1] = {
                dx: previousDelta.dx + delta.dx,
                dy: previousDelta.dy + delta.dy
            };
        } else {
            newDeltas.push(delta);
        }
    }

    return createPathFromDeltas(path[0], newDeltas);
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

function createPathFromDeltas(start: Point, deltas: Delta[]): Point[] {
    const points = [start];
    let current = start;

    for (const { dx, dy } of deltas) {
        const x = current.x + dx;
        const y = current.y + dy;
        current = { x, y };
        points.push(current);
    }

    return points;
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

        if (
            d1.dy === 0 &&
            d2.dx === 0 &&
            d3.dy === 0 &&
            Math.sign(d1.dx) === Math.sign(d3.dx) &&
            Math.sign(d2.dy) === Math.sign(d4.dy)
        ) {
            return simplifyDeltas([
                ...deltas.slice(0, i),
                { dx: d1.dx + d3.dx, dy: 0 },
                { dx: 0, dy: d2.dy },
                ...deltas.slice(i + 3)
            ]);
        }

        if (
            d1.dx === 0 &&
            d2.dy === 0 &&
            d3.dx === 0 &&
            Math.sign(d1.dy) === Math.sign(d3.dy) &&
            Math.sign(d2.dx) === Math.sign(d4.dx)
        ) {
            return simplifyDeltas([
                ...deltas.slice(0, i),
                { dx: 0, dy: d1.dy + d3.dy },
                { dx: d2.dx, dy: 0 },
                ...deltas.slice(i + 3)
            ]);
        }
    }

    return deltas;
}
