import * as React from "react";
import { getMarkerIdForRelationshipKind } from "./defs/RelationshipMarkers";
import { RenderOptions } from "./index";
import RelationshipLabels from "./RelationshipLabels";
import { Relationship, RelationshipKind } from "../../../core/domain";
import { Point } from "../../../core/geometry";
import { assertNever } from "../../../core/utils";

export default class RenderedRelationship extends React.Component<Props> {
    render() {
        const { relationship, path, renderOptions } = this.props;

        if (!renderOptions.shouldRenderElement(relationship.id)) {
            return null;
        }

        const markerId = getMarkerIdForRelationshipKind(relationship.kind);
        const markerEnd = markerId === null ? undefined : `url(#${markerId})`;

        const polylinePoints = path.map(point => `${point.x} ${point.y}`).join(",");

        const strokeDasharray = getSvgDasharrayForRelationshipKind(relationship.kind);

        return (
            <>
                <RelationshipLabels relationship={relationship} relationshipPath={path} />
                <polyline
                    key={relationship.id}
                    points={polylinePoints}
                    strokeWidth="1"
                    stroke="black"
                    strokeDasharray={strokeDasharray}
                    fill="none"
                    markerEnd={markerEnd}
                    pointerEvents="none"
                />
            </>
        );
    }
}
export function getSvgDasharrayForRelationshipKind(kind: RelationshipKind): string | undefined {
    switch (kind) {
        case RelationshipKind.Aggregation:
        case RelationshipKind.AssociationUnidirectional:
        case RelationshipKind.Composition:
        case RelationshipKind.Inheritance:
        case RelationshipKind.AssociationBidirectional:
        case RelationshipKind.ActivityControlFlow:
            return undefined;

        case RelationshipKind.Dependency:
        case RelationshipKind.Realization:
            return "7, 7";

        default:
            return assertNever(kind);
    }
}

interface Props {
    relationship: Relationship;
    path: Point[];
    renderOptions: RenderOptions;
}
