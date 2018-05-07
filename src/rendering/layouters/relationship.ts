import {
    beautifyPath,
    computePathLength,
    findClosestPoint,
    getBottomLeftCorner,
    getBottomRightCorner,
    getCorners,
    getPointOnPaddedBox,
    getTopLeftCorner,
    getTopRightCorner,
    lineSegmentIntersectsRect,
    padRect,
    Point,
    pointsAreEqual,
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
    const directPath = tryGetDirectPath(sourceRect, sourceEdge, targetRect, targetEdge);

    if (directPath !== null) {
        return directPath;
    }

    const startPointOnInnerEdge = getPointOnPaddedBox(sourceRect, sourceEdge, sourceEdgeOffset);
    const endPointOnInnerEdge = getPointOnPaddedBox(targetRect, targetEdge, targetEdgeOffset);

    if (straightLine) {
        return [startPointOnInnerEdge, endPointOnInnerEdge];
    }

    const BOX_PADDING = 40;

    const startPointOnOuterEdge = getPointOnPaddedBox(
        sourceRect,
        sourceEdge,
        sourceEdgeOffset,
        BOX_PADDING
    );

    const endPointOnOuterEdge = getPointOnPaddedBox(
        targetRect,
        targetEdge,
        targetEdgeOffset,
        BOX_PADDING
    );

    const paddedSourceRect = padRect(sourceRect, BOX_PADDING);
    const paddedTargetRect = padRect(targetRect, BOX_PADDING);

    const paddedSourceRect1px = padRect(sourceRect, BOX_PADDING - 1);
    const paddedTargetRect1px = padRect(targetRect, BOX_PADDING - 1);

    const sourceCorners = getCorners(paddedSourceRect);
    const targetCorners = getCorners(paddedTargetRect);

    const sourceCornerClosestToEndPoint = findClosestPoint(sourceCorners, endPointOnOuterEdge);
    const targetCornerClosestToClosestSourceCorner = findClosestPoint(
        targetCorners,
        sourceCornerClosestToEndPoint
    );

    const sourceCornerQueue = findShortestCornerQueue(
        paddedSourceRect,
        sourceEdge,
        startPointOnOuterEdge,
        sourceCornerClosestToEndPoint
    );

    const targetCornerQueue = findShortestCornerQueue(
        paddedTargetRect,
        targetEdge,
        endPointOnOuterEdge,
        targetCornerClosestToClosestSourceCorner
    );

    const pathFromStart = [startPointOnInnerEdge, startPointOnOuterEdge];
    const pathFromEnd = [endPointOnInnerEdge, endPointOnOuterEdge];

    let currentStartPoint = startPointOnOuterEdge;
    let currentEndPoint = endPointOnOuterEdge;

    console.log("===");
    while (true) {
        const pointsSeeEachOther =
            !lineSegmentIntersectsRect(currentStartPoint, currentEndPoint, paddedSourceRect1px) &&
            !lineSegmentIntersectsRect(currentStartPoint, currentEndPoint, paddedTargetRect1px);
        console.log(pointsSeeEachOther);

        if (pointsSeeEachOther) {
            const currentStartAxis = getAxis(pathFromStart);
            const currentEndAxis = getAxis(pathFromEnd);

            if (currentStartAxis === "HORIZONTAL" && currentEndAxis === "HORIZONTAL") {
                const middleX = (currentStartPoint.x + currentEndPoint.x) / 2;
                pathFromStart.push(
                    { x: middleX, y: currentStartPoint.y },
                    { x: middleX, y: currentEndPoint.y }
                );
            } else if (currentStartAxis === "VERTICAL" && currentEndAxis === "VERTICAL") {
                const middleY = (currentStartPoint.y + currentEndPoint.y) / 2;
                pathFromStart.push(
                    { x: currentStartPoint.x, y: middleY },
                    { x: currentEndPoint.x, y: middleY }
                );
            } else if (currentStartAxis === "HORIZONTAL" && currentEndAxis === "VERTICAL") {
                pathFromStart.push({ x: currentEndPoint.x, y: currentStartPoint.y });
            } else {
                pathFromStart.push({
                    x: currentStartPoint.x,
                    y: currentEndPoint.y
                });
            }

            break;
        }

        const nextSourceCorner = sourceCornerQueue.shift();

        if (nextSourceCorner !== undefined) {
            pathFromStart.push(nextSourceCorner);
            currentStartPoint = nextSourceCorner;
        } else {
            const nextTargetCorner = targetCornerQueue.shift();

            if (nextTargetCorner !== undefined) {
                pathFromEnd.push(nextTargetCorner);
                currentEndPoint = nextTargetCorner;
            } else {
                return [
                    startPointOnInnerEdge,
                    startPointOnOuterEdge,
                    endPointOnOuterEdge,
                    endPointOnInnerEdge
                ];
            }
        }
    }

    const pathToEnd = pathFromEnd.reverse();
    const path = [...pathFromStart, ...pathToEnd];

    return beautifyPath(path);
}

function findShortestCornerQueue(
    rect: Rect,
    edge: RectEdge,
    pointOnOuterEdge: Point,
    destinationCorner: Point | null
): Point[] {
    let clockwiseCornerQueue: Point[];
    let counterClockwiseCornerQueue: Point[];

    const tl = getTopLeftCorner(rect);
    const tr = getTopRightCorner(rect);
    const bl = getBottomLeftCorner(rect);
    const br = getBottomRightCorner(rect);

    switch (edge) {
        case "TOP":
            clockwiseCornerQueue = [tr, br, bl, tl];
            counterClockwiseCornerQueue = [tl, bl, br, tr];
            break;

        case "RIGHT":
            clockwiseCornerQueue = [br, bl, tl, tr];
            counterClockwiseCornerQueue = [tr, tl, bl, br];
            break;

        case "BOTTOM":
            clockwiseCornerQueue = [bl, tl, tr, br];
            counterClockwiseCornerQueue = [br, tr, tl, bl];
            break;

        case "LEFT":
            clockwiseCornerQueue = [tl, tr, br, bl];
            counterClockwiseCornerQueue = [bl, br, tr, tl];
            break;

        default:
            throw Error("Unreachable code");
    }

    if (destinationCorner !== null) {
        for (let i = 0; i < 4; i++) {
            if (pointsAreEqual(clockwiseCornerQueue[i], destinationCorner)) {
                clockwiseCornerQueue = clockwiseCornerQueue.slice(0, i + 1);
                break;
            }
        }

        for (let i = 0; i < 4; i++) {
            if (pointsAreEqual(counterClockwiseCornerQueue[i], destinationCorner)) {
                counterClockwiseCornerQueue = counterClockwiseCornerQueue.slice(0, i + 1);
                break;
            }
        }
    }

    const clockwisePathLength = computePathLength([pointOnOuterEdge, ...clockwiseCornerQueue]);
    const counterClockwisePathLength = computePathLength([
        pointOnOuterEdge,
        ...counterClockwiseCornerQueue
    ]);

    return clockwisePathLength < counterClockwisePathLength
        ? clockwiseCornerQueue
        : counterClockwiseCornerQueue;
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

function getAxis(path: Point[]) {
    const secondToLastPoint = path[path.length - 2];
    const lastPoint = path[path.length - 1];

    const dx = lastPoint.x - secondToLastPoint.x;
    const dy = lastPoint.y - secondToLastPoint.y;

    if (dx === 0 && dy !== 0) {
        return "VERTICAL";
    }

    if (dx !== 0 && dy === 0) {
        return "HORIZONTAL";
    }

    return null;
}
