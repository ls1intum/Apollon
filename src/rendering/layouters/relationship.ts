import {
    beautifyPath,
    getBottomLeftCorner,
    getBottomRightCorner,
    getPointOnPaddedBox,
    getTopLeftCorner,
    getTopRightCorner,
    lineSegmentIntersectsRect,
    padRect,
    Point,
    Rect,
    RectEdge
} from "../../core/geometry";
import { assertNever } from "../../core/utils";

export function computeRelationshipPath(
    sourceRect: Rect,
    sourceEdge: RectEdge,
    sourceEdgeOffset: number,
    targetRect: Rect,
    targetEdge: RectEdge,
    targetEdgeOffset: number,
    straightLine: boolean
): Point[] {
    const boxPadding = 40;

    const directPath = tryGetDirectPath(sourceRect, sourceEdge, targetRect, targetEdge);

    if (directPath !== null) {
        return directPath;
    }

    const startPointOnInnerEdge = getPointOnPaddedBox(sourceRect, sourceEdge, sourceEdgeOffset);
    const endPointOnInnerEdge = getPointOnPaddedBox(targetRect, targetEdge, targetEdgeOffset);

    if (straightLine) {
        return [startPointOnInnerEdge, endPointOnInnerEdge];
    }

    const startPointOnOuterEdge = getPointOnPaddedBox(
        sourceRect,
        sourceEdge,
        sourceEdgeOffset,
        boxPadding
    );

    const endPointOnOuterEdge = getPointOnPaddedBox(
        targetRect,
        targetEdge,
        targetEdgeOffset,
        boxPadding
    );

    const paddedSourceRect = padRect(sourceRect, boxPadding);
    const paddedTargetRect = padRect(targetRect, boxPadding);

    const paddedSourceRect1px = padRect(sourceRect, boxPadding - 1);
    const paddedTargetRect1px = padRect(targetRect, boxPadding - 1);

    let currentStart: [Point, Direction] = [startPointOnOuterEdge, edgeToDirection(sourceEdge)];
    let currentEnd: [Point, Direction] = [endPointOnOuterEdge, edgeToDirection(targetEdge)];

    const startCornerQueue = getCornerQueue(
        sourceEdge,
        startPointOnOuterEdge,
        endPointOnOuterEdge,
        paddedSourceRect,
        paddedTargetRect
    );

    const endCornerQueue = getCornerQueue(
        targetEdge,
        endPointOnOuterEdge,
        startPointOnOuterEdge,
        paddedTargetRect,
        paddedSourceRect
    );

    let advanceNext: "start" | "end" = "start";

    const pointsFromStart = [startPointOnInnerEdge, startPointOnOuterEdge];
    const pointsFromEnd = [endPointOnOuterEdge, endPointOnInnerEdge];

    while (true) {
        const [currentStartPoint, currentStartDirection] = currentStart;
        const [currentEndPoint, currentEndDirection] = currentEnd;

        const pointsSeeEachOther =
            !lineSegmentIntersectsRect(currentStartPoint, currentEndPoint, paddedSourceRect1px) &&
            !lineSegmentIntersectsRect(currentStartPoint, currentEndPoint, paddedTargetRect1px);

        if (pointsSeeEachOther) {
            const currentStartAxis = getAxis(currentStartDirection);
            const currentEndAxis = getAxis(currentEndDirection);

            if (currentStartAxis === "HORIZONTAL" && currentEndAxis === "HORIZONTAL") {
                const middleX = (currentStartPoint.x + currentEndPoint.x) / 2;
                pointsFromStart.push(
                    { x: middleX, y: currentStartPoint.y },
                    { x: middleX, y: currentEndPoint.y }
                );
            } else if (currentStartAxis === "VERTICAL" && currentEndAxis === "VERTICAL") {
                const middleY = (currentStartPoint.y + currentEndPoint.y) / 2;
                pointsFromStart.push(
                    { x: currentStartPoint.x, y: middleY },
                    { x: currentEndPoint.x, y: middleY }
                );
            } else if (currentStartAxis === "HORIZONTAL" && currentEndAxis === "VERTICAL") {
                pointsFromStart.push({
                    x: currentEndPoint.x,
                    y: currentStartPoint.y
                });
            } else {
                pointsFromStart.push({
                    x: currentStartPoint.x,
                    y: currentEndPoint.y
                });
            }

            break;
        }

        if (advanceNext === "start") {
            const currentPoint = startCornerQueue.shift();

            if (!currentPoint) {
                return [
                    startPointOnInnerEdge,
                    startPointOnOuterEdge,
                    endPointOnOuterEdge,
                    endPointOnInnerEdge
                ];
            }

            pointsFromStart.push(currentPoint[0]);
            currentStart = currentPoint;
            advanceNext = "end";
        } else {
            const currentPoint = endCornerQueue.shift();

            if (!currentPoint) {
                return [
                    startPointOnInnerEdge,
                    startPointOnOuterEdge,
                    endPointOnOuterEdge,
                    endPointOnInnerEdge
                ];
            }

            pointsFromEnd.unshift(currentPoint[0]);
            currentEnd = currentPoint;
            advanceNext = "start";
        }
    }

    const path = [...pointsFromStart, ...pointsFromEnd];
    const beautifiedPath = beautifyPath(path);

    return beautifiedPath;
}

function tryGetDirectPath(
    source: Rect,
    sourceEdge: RectEdge,
    target: Rect,
    targetEdge: RectEdge
): Point[] | null {
    const OVERLAP_THRESHOLD = 40;

    if (sourceEdge === "RIGHT" && targetEdge === "LEFT" && target.x >= source.x + source.width) {
        const overlapY = computeOverlap(
            [source.y, source.y + source.height],
            [target.y, target.y + target.height]
        );

        if (overlapY !== null && overlapY[1] - overlapY[0] >= OVERLAP_THRESHOLD) {
            const middleY = (overlapY[0] + overlapY[1]) / 2;
            const start: Point = { x: source.x + source.width, y: middleY };
            const end: Point = { x: target.x, y: middleY };
            return [start, end];
        }
    }

    if (sourceEdge === "LEFT" && targetEdge === "RIGHT" && source.x >= target.x + target.width) {
        const overlapY = computeOverlap(
            [source.y, source.y + source.height],
            [target.y, target.y + target.height]
        );

        if (overlapY !== null && overlapY[1] - overlapY[0] >= OVERLAP_THRESHOLD) {
            const middleY = (overlapY[0] + overlapY[1]) / 2;
            const start: Point = { x: source.x, y: middleY };
            const end: Point = { x: target.x + target.width, y: middleY };
            return [start, end];
        }
    }

    if (sourceEdge === "BOTTOM" && targetEdge === "TOP" && target.y >= source.y + source.height) {
        const overlapX = computeOverlap(
            [source.x, source.x + source.width],
            [target.x, target.x + target.width]
        );

        if (overlapX !== null && overlapX[1] - overlapX[0] >= OVERLAP_THRESHOLD) {
            const middleX = (overlapX[0] + overlapX[1]) / 2;
            const start: Point = { x: middleX, y: source.y + source.height };
            const end: Point = { x: middleX, y: target.y };
            return [start, end];
        }
    }

    if (sourceEdge === "TOP" && targetEdge === "BOTTOM") {
        if (source.y >= target.y + target.height) {
            const overlapX = computeOverlap(
                [source.x, source.x + source.width],
                [target.x, target.x + target.width]
            );

            if (overlapX !== null && overlapX[1] - overlapX[0] >= OVERLAP_THRESHOLD) {
                const middleX = (overlapX[0] + overlapX[1]) / 2;
                const start: Point = { x: middleX, y: source.y };
                const end: Point = { x: middleX, y: target.y + target.height };
                return [start, end];
            }
        }
    }

    return null;
}

function computeOverlap(
    [from1, to1]: [number, number],
    [from2, to2]: [number, number]
): [number, number] | null {
    const largerFrom = Math.max(from1, from2);
    const smallerTo = Math.min(to1, to2);

    return largerFrom <= smallerTo ? [largerFrom, smallerTo] : null;
}

type Direction = "UP" | "LEFT" | "RIGHT" | "DOWN";

function edgeToDirection(edge: RectEdge): Direction {
    switch (edge) {
        case "TOP":
            return "UP";

        case "LEFT":
            return "LEFT";

        case "RIGHT":
            return "RIGHT";

        case "BOTTOM":
            return "DOWN";

        default:
            return assertNever(edge);
    }
}

function getAxis(direction: Direction) {
    switch (direction) {
        case "UP":
        case "DOWN":
            return "VERTICAL";

        case "LEFT":
        case "RIGHT":
            return "HORIZONTAL";

        default:
            return assertNever(direction);
    }
}

function getCornerQueue(
    edge: RectEdge,
    thisStart: Point,
    otherStart: Point,
    thisRect: Rect,
    otherRect: Rect
): [Point, Direction][] {
    const deltaX = thisStart.x - otherStart.x;
    const deltaY = thisStart.y - otherStart.y;

    const clockwise =
        (edge === "TOP" && deltaX < 0) ||
        (edge === "RIGHT" && deltaY < 0) ||
        (edge === "BOTTOM" && deltaX >= 0) ||
        (edge === "LEFT" && deltaY >= 0);

    const corners: [Point, Direction][] = [
        [getTopLeftCorner(thisRect), clockwise ? "UP" : "LEFT"],
        [getTopRightCorner(thisRect), clockwise ? "RIGHT" : "UP"],
        [getBottomRightCorner(thisRect), clockwise ? "DOWN" : "RIGHT"],
        [getBottomLeftCorner(thisRect), clockwise ? "LEFT" : "DOWN"]
    ];

    const skip = ["left", "top", "right", "bottom"].indexOf(edge);
    const rotatedCorners = [...corners.slice(skip), ...corners.slice(0, skip)];

    return clockwise ? rotatedCorners : (rotatedCorners.reverse() as any);
}
