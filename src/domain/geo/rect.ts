import { Point } from "./point";
import { assertNever } from "../utils";

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type RectEdge = "TOP" | "LEFT" | "RIGHT" | "BOTTOM";

export function getCorners(rect: Rect): Point[] {
    return [
        getTopLeftCorner(rect),
        getTopRightCorner(rect),
        getBottomRightCorner(rect),
        getBottomLeftCorner(rect)
    ];
}

export function getTopLeftCorner(rect: Rect) {
    return {
        x: rect.x,
        y: rect.y
    };
}

export function getTopRightCorner(rect: Rect): Point {
    return {
        x: rect.x + rect.width,
        y: rect.y
    };
}

export function getBottomLeftCorner(rect: Rect): Point {
    return {
        x: rect.x,
        y: rect.y + rect.height
    };
}

export function getBottomRightCorner(rect: Rect): Point {
    return {
        x: rect.x + rect.width,
        y: rect.y + rect.height
    };
}

export function enlargeRect(rect: Rect, padding: number): Rect {
    return {
        x: rect.x - padding,
        y: rect.y - padding,
        width: rect.width + 2 * padding,
        height: rect.height + 2 * padding
    };
}

export function getPointOnRect(rect: Rect, edge: RectEdge, offset: number): Point {
    const { x, y, width, height } = rect;

    switch (edge) {
        case "LEFT":
            return {
                x,
                y: y + height * offset
            };

        case "RIGHT":
            return {
                x: x + width,
                y: y + height * offset
            };

        case "TOP":
            return {
                x: x + width * offset,
                y
            };

        case "BOTTOM":
            return {
                x: x + width * offset,
                y: y + height
            };

        default:
            return assertNever(edge);
    }
}
