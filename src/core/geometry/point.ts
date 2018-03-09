import { isAlmostZero } from "./math/floatingPoint";

export interface Point {
    x: number;
    y: number;
}

export function pointsAreEqual(p: Point, q: Point) {
    const dx = Math.abs(p.x - q.x);
    const dy = Math.abs(p.y - q.y);

    return isAlmostZero(dx) && isAlmostZero(dy);
}

export function snapToGrid(position: number, gridSize: number): number {
    return Math.round(position / gridSize) * gridSize;
}

export function snapPointToGrid(p: Point, gridSize: number): Point {
    return {
        x: snapToGrid(p.x, gridSize),
        y: snapToGrid(p.y, gridSize)
    };
}
