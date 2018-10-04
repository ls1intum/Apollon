import { isAlmostZero } from "./math/floatingPoint";
import { XYCoord } from "react-dnd";

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

export function snapPointToGrid(p: Point | XYCoord, gridSize: number): Point {
    return {
        x: snapToGrid(p.x, gridSize),
        y: snapToGrid(p.y, gridSize)
    };
}

export function findClosestPoint(candidates: Point[], target: Point) {
    let minDistance = Infinity;
    let closestPoint = candidates[0];

    for (const candidate of candidates) {
        const distance = distanceBetweenPoints(target, candidate);
        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = candidate;
        }
    }

    return closestPoint;
}

export function distanceBetweenPoints(p1: Point, p2: Point): number {
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    return Math.sqrt(dx ** 2 + dy ** 2);
}
