import * as React from "react";
import { getMarkerIdForRelationshipKind } from "./defs/RelationshipMarkers";
import { RenderOptions } from "./index";
import RelationshipLabels from "./RelationshipLabels";
import { RelationshipKind } from "../../../domain/Relationship";
import { Point } from "../../../domain/geo";
import { Relationship } from '../../../services/Interface/ExternalState';

export default class RenderedRelationship extends React.Component<Props> {
    render() {
        const { relationship, path, renderOptions } = this.props;

        if (!renderOptions.shouldRenderElement(relationship.id)) {
            return null;
        }

        const markerId = undefined; //getMarkerIdForRelationshipKind(relationship.kind);
        const markerEnd = markerId === null ? undefined : `url(#${markerId})`;

        const polylinePoints = path.map(point => `${point.x} ${point.y}`).join(",");

        const strokeDasharray = undefined; //getSvgDasharrayForRelationshipKind(relationship.kind);

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
        case RelationshipKind.ClassDependency:
        case RelationshipKind.ClassRealization:
        case RelationshipKind.UseCaseInclude:
            return "7, 7";
        default:
            return undefined;

    }
}

interface Props {
    relationship: Relationship;
    path: Point[];
    renderOptions: RenderOptions;
}
