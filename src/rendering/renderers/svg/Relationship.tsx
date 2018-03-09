import * as React from "react";
import { getMarkerIdForRelationshipKind } from "./defs/RelationshipMarkers";
import { SvgRenderOptions } from "./index";
import RelationshipLabels from "./RelationshipLabels";
import * as UML from "../../../core/domain";
import { Point } from "../../../core/geometry";
import { assertNever } from "../../../core/utils";

export default class Relationship extends React.Component<Props> {
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
export function getSvgDasharrayForRelationshipKind(kind: UML.RelationshipKind): string | undefined {
    switch (kind) {
        case UML.RelationshipKind.Aggregation:
        case UML.RelationshipKind.AssociationUnidirectional:
        case UML.RelationshipKind.Composition:
        case UML.RelationshipKind.Inheritance:
        case UML.RelationshipKind.AssociationBidirectional:
            return undefined;

        case UML.RelationshipKind.Dependency:
        case UML.RelationshipKind.Realization:
            return "7, 7";

        default:
            return assertNever(kind);
    }
}

interface Props {
    relationship: UML.Relationship;
    path: Point[];
    renderOptions: SvgRenderOptions;
}
