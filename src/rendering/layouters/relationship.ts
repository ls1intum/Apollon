import {
    beautifyPath,
    computePathLength,
    enlargeRect,
    findClosestPoint,
    getBottomLeftCorner,
    getBottomRightCorner,
    getCorners,
    getPointOnRect,
    getTopLeftCorner,
    getTopRightCorner,
    lineSegmentIntersectsRect,
    Point,
    pointsAreEqual,
    Rect,
    RectEdge
} from "../../domain/geo";

export function computeRelationshipPath(
    sourceRect: Rect,
    sourceEdge: RectEdge,
    sourceEdgeOffset: number,
    targetRect: Rect,
    targetEdge: RectEdge,
    targetEdgeOffset: number,
    straightLine: boolean
): Point[] {
    const straightPath = tryFindStraightPath(sourceRect, sourceEdge, targetRect, targetEdge);

    // If there is a straight path, return that one
    if (straightPath !== null) {
        return straightPath;
    }

    const startPointOnInnerEdge = getPointOnRect(sourceRect, sourceEdge, sourceEdgeOffset);
    const endPointOnInnerEdge = getPointOnRect(targetRect, targetEdge, targetEdgeOffset);

    // If the user forced this relationship path to be a straight line,
    // directly connect the start and end points, even if that results in an angled line
    if (straightLine) {
        return [startPointOnInnerEdge, endPointOnInnerEdge];
    }

    // Each entity has an invisible margin around it (the "crumple zone")
    // in which we try not to place any segments of the relationship path
    const ENTITY_MARGIN = 40;

    // Compute an enlarged version of the source and target rectangles,
    // taking into account the entity margin
    const sourceMarginRect = enlargeRect(sourceRect, ENTITY_MARGIN);
    const targetMarginRect = enlargeRect(targetRect, ENTITY_MARGIN);

    // Do the same computation again, subtracting 1 from the margin so as
    // to allow for path segments to be placed on the outline of the margin rectangle
    const sourceMarginRect1px = enlargeRect(sourceRect, ENTITY_MARGIN - 1);
    const targetMarginRect1px = enlargeRect(targetRect, ENTITY_MARGIN - 1);

    // Calculate the exact position of the start and end points on their respective margin rectangle
    const startPointOnMarginBox = getPointOnRect(sourceMarginRect, sourceEdge, sourceEdgeOffset);
    const endPointOnMarginBox = getPointOnRect(targetMarginRect, targetEdge, targetEdgeOffset);

    // Determine the source corner that's closest to the point
    // on the margin box of the target entity
    const sourceCornerClosestToEndPoint = findClosestPoint(
        getCorners(sourceMarginRect),
        endPointOnMarginBox
    );

    // Determine the target corner that's closest to the previously determined source corner
    const targetCornerClosestToClosestSourceCorner = findClosestPoint(
        getCorners(targetMarginRect),
        sourceCornerClosestToEndPoint
    );

    // Determine the corner queue for the source entity
    const sourceCornerQueue = determineCornerQueue(
        sourceMarginRect,
        sourceEdge,
        startPointOnMarginBox,
        sourceCornerClosestToEndPoint
    );

    // Determine the corner queue for the target entity
    const targetCornerQueue = determineCornerQueue(
        targetMarginRect,
        targetEdge,
        endPointOnMarginBox,
        targetCornerClosestToClosestSourceCorner
    );

    // The relationship path can be partitioned into two segments:
    // a prefix from the start point and a suffix to the end point
    const pathFromStart = [startPointOnInnerEdge, startPointOnMarginBox];
    const pathFromEnd = [endPointOnInnerEdge, endPointOnMarginBox];

    // We build the relationship path up both from the start and the end
    let currentStartPoint = startPointOnMarginBox;
    let currentEndPoint = endPointOnMarginBox;

    while (true) {
        const startAndEndPointCanBeConnected =
            !lineSegmentIntersectsRect(currentStartPoint, currentEndPoint, sourceMarginRect1px) &&
            !lineSegmentIntersectsRect(currentStartPoint, currentEndPoint, targetMarginRect1px);

        // As soon as the current start and end points can be connected with a straight line
        // without intersecting either entity rectangle, we add one or two more points to the relationship path,
        // depending on the axes of the two start/end path segments and exit from the loop
        if (startAndEndPointCanBeConnected) {
            type PathSegment = [Point, Point];
            const currentStartAxis = getAxisForPathSegment(pathFromStart.slice(-2) as PathSegment);
            const currentEndAxis = getAxisForPathSegment(pathFromEnd.slice(-2) as PathSegment);

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

            // We're done here!
            break;
        }

        // We got to this point because the start and end point can't (yet) see each other,
        // thus advance to the next corner of the source entity
        const nextSourceCorner = sourceCornerQueue.shift();

        if (nextSourceCorner !== undefined) {
            pathFromStart.push(nextSourceCorner);
            currentStartPoint = nextSourceCorner;
        } else {
            // The queue of source entity corners is already empty,
            // thus advance to the next corner of the target entity
            const nextTargetCorner = targetCornerQueue.shift();

            if (nextTargetCorner !== undefined) {
                pathFromEnd.push(nextTargetCorner);
                currentEndPoint = nextTargetCorner;
            } else {
                // We've emptied the corner queues of both entities, but the current start and end points
                // still can't be connected with a straight line. This can happen if the two entities
                // are placed closely enough to each other that their margin rectangles intersect.
                // We return a simple (and usually angled) path in this case.
                return [
                    startPointOnInnerEdge,
                    startPointOnMarginBox,
                    endPointOnMarginBox,
                    endPointOnInnerEdge
                ];
            }
        }
    }

    // Compose the entire path
    const pathToEnd = pathFromEnd.reverse();
    const path = [...pathFromStart, ...pathToEnd];

    // Return a beautified version of the relationship path that reduces the number of corners
    // in the relationship path, removes unnecessary points ("transit nodes"), etc.
    return beautifyPath(path);
}

function determineCornerQueue(
    rect: Rect,
    edge: RectEdge,
    pointOnOuterEdge: Point,
    destinationCorner: Point | null
): Point[] {
    let clockwiseCornerQueue: Point[];
    let counterClockwiseCornerQueue: Point[];

    // Get all corners of the rectangle
    const tl = getTopLeftCorner(rect);
    const tr = getTopRightCorner(rect);
    const bl = getBottomLeftCorner(rect);
    const br = getBottomRightCorner(rect);

    // Determine the clockwise and counter-clickwise order of corners
    // when starting at the selected edge of the rectangle
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

    // If we have a destination corner, shorten both corner queues
    // to the prefix that ends with the destination corner
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

    // Compute the path length for both corner queues
    const clockwisePathLength = computePathLength([pointOnOuterEdge, ...clockwiseCornerQueue]);
    const counterClockwisePathLength = computePathLength([
        pointOnOuterEdge,
        ...counterClockwiseCornerQueue
    ]);

    // Return the shorter corner queue
    return clockwisePathLength < counterClockwisePathLength
        ? clockwiseCornerQueue
        : counterClockwiseCornerQueue;
}

function tryFindStraightPath(
    source: Rect,
    sourceEdge: RectEdge,
    target: Rect,
    targetEdge: RectEdge
): Point[] | null {
    const OVERLAP_THRESHOLD = 40;

    /*
        #######           #######
        # ~~~ # --------> # ~~~ #
        #######           #######
    */
    if (sourceEdge === "RIGHT" && targetEdge === "LEFT" && target.x >= source.x + source.width) {
        const overlapY = computeOverlap(
            [source.y, source.y + Math.max(OVERLAP_THRESHOLD, source.height)],
            [target.y, target.y + Math.max(OVERLAP_THRESHOLD, target.height)]
        );

        if (overlapY !== null && overlapY[1] - overlapY[0] >= OVERLAP_THRESHOLD) {
            const middleY = (overlapY[0] + overlapY[1]) / 2;
            const start: Point = { x: source.x + source.width, y: middleY };
            const end: Point = { x: target.x, y: middleY };
            return [start, end];
        }
    }

    /*
        #######           #######
        # ~~~ # <-------- # ~~~ #
        #######           #######
    */
    if (sourceEdge === "LEFT" && targetEdge === "RIGHT" && source.x >= target.x + target.width) {
        const overlapY = computeOverlap(
            [source.y, source.y + Math.max(OVERLAP_THRESHOLD, source.height)],
            [target.y, target.y + Math.max(OVERLAP_THRESHOLD, target.height)]
        );

        if (overlapY !== null && overlapY[1] - overlapY[0] >= OVERLAP_THRESHOLD) {
            const middleY = (overlapY[0] + overlapY[1]) / 2;
            const start: Point = { x: source.x, y: middleY };
            const end: Point = { x: target.x + target.width, y: middleY };
            return [start, end];
        }
    }

    /*
        #######
        # ~~~ #
        #######
           |
           |
           ∨
        #######
        # ~~~ #
        #######
    */
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

    /*
        #######
        # ~~~ #
        #######
           ∧
           |
           |
        #######
        # ~~~ #
        #######
    */
    if (sourceEdge === "TOP" && targetEdge === "BOTTOM" && source.y >= target.y + target.height) {
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

    return null;
}

function computeOverlap(
    range1: [number, number],
    range2: [number, number]
): [number, number] | null {
    const [from1, to1] = range1;
    const [from2, to2] = range2;

    const largerFrom = Math.max(from1, from2);
    const smallerTo = Math.min(to1, to2);

    return largerFrom <= smallerTo ? [largerFrom, smallerTo] : null;
}

function getAxisForPathSegment(pathSegment: [Point, Point]) {
    // Determine dx and dy
    const [p, q] = pathSegment;
    const dx = q.x - p.x;
    const dy = q.y - p.y;

    // We have a vertical path segment if only dy is non-zero
    if (dx === 0 && dy !== 0) {
        return "VERTICAL";
    }

    // We have a horizontal path segment if only dx is non-zero
    if (dx !== 0 && dy === 0) {
        return "HORIZONTAL";
    }

    // We neither have a horizontal nor vertical path segment
    return null;
}
