import * as React from "react";
import { RelationshipKind } from "../../../../domain/Relationship";

export default class RelationshipMarkers extends React.Component {
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
                    strokeDasharray="1,0"
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
                    strokeDasharray="1,0"
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
        case RelationshipKind.ClassAggregation:
            return RelationshipKindMarker.Rhombus;

        case RelationshipKind.ClassUnidirectional:
        case RelationshipKind.ClassDependency:
        case RelationshipKind.ActivityControlFlow:
        case RelationshipKind.UseCaseInclude:
            return RelationshipKindMarker.Arrow;

        case RelationshipKind.ClassComposition:
            return RelationshipKindMarker.RhombusFilled;

        case RelationshipKind.ClassInheritance:
        case RelationshipKind.ClassRealization:
        case RelationshipKind.UseCaseGeneralization:
            return RelationshipKindMarker.Triangle;

        default:
            return null;
    }
}

export const enum RelationshipKindMarker {
    Arrow = "RelationshipKind_Arrow",
    Rhombus = "RelationshipKind_Rhombus",
    RhombusFilled = "RelationshipKind_RhombusFilled",
    Triangle = "RelationshipKind_Triangle"
}
