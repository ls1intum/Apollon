import { Point } from "./point";
import { assertNever } from "../utils";

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type RectEdge = "TOP" | "LEFT" | "RIGHT" | "BOTTOM";

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

export function padRect(rect: Rect, padding: number): Rect {
    return {
        x: rect.x - padding,
        y: rect.y - padding,
        width: rect.width + 2 * padding,
        height: rect.height + 2 * padding
    };
}

export function getPointOnPaddedBox(
    rect: Rect,
    edge: RectEdge,
    offset: number,
    padding = 0
): Point {
    const { x, y, width, height } = rect;

    switch (edge) {
        case "LEFT":
            return {
                x: x - padding,
                y: y + height * offset
            };

        case "RIGHT":
            return {
                x: x + width + padding,
                y: y + height * offset
            };

        case "TOP":
            return {
                x: x + width * offset,
                y: y - padding
            };

        case "BOTTOM":
            return {
                x: x + width * offset,
                y: y + height + padding
            };

        default:
            return assertNever(edge);
    }
}
