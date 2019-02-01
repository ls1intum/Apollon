import { Point, Rect } from ".";

export function computeBoundingBox(points: Point[]): Rect {
    if (points.length === 0) {
        throw Error("Can't compute bounding box of empty point array");
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
