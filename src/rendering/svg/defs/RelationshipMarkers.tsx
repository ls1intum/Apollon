import * as React from "react";
import { RelationshipKind } from "../../../core/domain";
import { assertNever } from "../../../core/utils";

export default class RelationshipMarkers extends React.PureComponent {
    render() {
        return (
            <>
                <marker
                    id={RelationshipKindMarker.Rhombus}
                    viewBox="0 0 30 30"
                    markerWidth="30"
                    markerHeight="30"
                    refX="30"
                    refY="15"
                    orient="auto"
                    markerUnits="strokeWidth"
                >
                    <path d="M0,15 L15,22 L30,15 L15,8 z" fill="white" stroke="black" />
                </marker>

                <marker
                    id={RelationshipKindMarker.Arrow}
                    viewBox="0 0 30 30"
                    markerWidth="22"
                    markerHeight="30"
                    refX="30"
                    refY="15"
                    orient="auto"
                    markerUnits="strokeWidth"
                >
                    <path d="M0,29 L30,15 L0,1" fill="none" stroke="black" />
                </marker>

                <marker
                    id={RelationshipKindMarker.RhombusFilled}
                    viewBox="0 0 30 30"
                    markerWidth="30"
                    markerHeight="30"
                    refX="30"
                    refY="15"
                    orient="auto"
                    markerUnits="strokeWidth"
                >
                    <path d="M0,15 L15,22 L30,15 L15,8 z" fill="black" />
                </marker>

                <marker
                    id={RelationshipKindMarker.Triangle}
                    viewBox="0 0 30 30"
                    markerWidth="22"
                    markerHeight="30"
                    refX="30"
                    refY="15"
                    orient="auto"
                    markerUnits="strokeWidth"
                >
                    <path d="M0,1 L0,29 L30,15 z" fill="white" stroke="black" />
                </marker>
            </>
        );
    }
}

export function getMarkerIdForRelationshipKind(
    kind: RelationshipKind
): RelationshipKindMarker | null {
    switch (kind) {
        case RelationshipKind.Aggregation:
            return RelationshipKindMarker.Rhombus;

        case RelationshipKind.AssociationUnidirectional:
        case RelationshipKind.Dependency:
            return RelationshipKindMarker.Arrow;

        case RelationshipKind.Composition:
            return RelationshipKindMarker.RhombusFilled;

        case RelationshipKind.Inheritance:
        case RelationshipKind.Realization:
            return RelationshipKindMarker.Triangle;

        case RelationshipKind.AssociationBidirectional:
            return null;

        default:
            return assertNever(kind);
    }
}

export const enum RelationshipKindMarker {
    Arrow = "RelationshipKind_Arrow",
    Rhombus = "RelationshipKind_Rhombus",
    RhombusFilled = "RelationshipKind_RhombusFilled",
    Triangle = "RelationshipKind_Triangle"
}
