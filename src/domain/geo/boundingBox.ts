import { Point, Rect } from ".";

export function computeBoundingBox(points: Point[]): Rect {
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
        height: maxY - minY
    };
}
