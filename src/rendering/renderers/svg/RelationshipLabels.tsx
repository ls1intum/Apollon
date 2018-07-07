import * as React from "react";
import styled from "styled-components";
import { Relationship, RelationshipEnd } from "../../../core/domain";
import { Delta, Point, RectEdge } from "../../../core/geometry";
import { assertNever } from "../../../core/utils";

const Text = styled.text`
    user-select: none;
`;

export default class RelationshipLabels extends React.Component<Props> {
    render() {
        const { relationshipPath } = this.props;
        const { kind, source, target } = this.props.relationship;

        const sourcePoint = relationshipPath[0];
        const targetPoint = relationshipPath[relationshipPath.length - 1];

        const targetEndHasMarker = kind !== "ASSOCIATION_BIDIRECTIONAL";

        return (
            <>
                {this.renderMultiplicity(source, sourcePoint, false)}
                {this.renderMultiplicity(target, targetPoint, targetEndHasMarker)}

                {this.renderRole(source, sourcePoint, false)}
                {this.renderRole(target, targetPoint, targetEndHasMarker)}
            </>
        );
    }

    renderMultiplicity(relationshipEnd: RelationshipEnd, position: Point, hasMarker: boolean) {
        if (!relationshipEnd.multiplicity) {
            return null;
        }

        const { alignmentBaseline, textAnchor, offset } = RelationshipLabels.layoutText(
            relationshipEnd.edge,
            hasMarker,
            "LEFT",
            "BOTTOM"
        );

        const x = position.x + offset.dx;
        const y = position.y + offset.dy;

        return (
            <Text x={x} y={y} textAnchor={textAnchor} dominantBaseline={alignmentBaseline}>
                {relationshipEnd.multiplicity}
            </Text>
        );
    }

    renderRole(relationshipEnd: RelationshipEnd, position: Point, hasMarker: boolean) {
        if (!relationshipEnd.role) {
            return null;
        }

        const { alignmentBaseline, textAnchor, offset } = RelationshipLabels.layoutText(
            relationshipEnd.edge,
            hasMarker,
            "RIGHT",
            "TOP"
        );

        const x = position.x + offset.dx;
        const y = position.y + offset.dy;

        return (
            <Text x={x} y={y} textAnchor={textAnchor} alignmentBaseline={alignmentBaseline}>
                {relationshipEnd.role}
            </Text>
        );
    }

    static layoutText(
        edge: RectEdge,
        leaveRoomForMarker: boolean,
        preferredHorizontalSide: "LEFT" | "RIGHT",
        preferredVerticalSide: "TOP" | "BOTTOM"
    ): { alignmentBaseline: "auto" | "hanging"; textAnchor: "start" | "end"; offset: Delta } {
        const deltaAlongNormal = 8;
        const deltaAlongEdge = leaveRoomForMarker ? 31 : deltaAlongNormal;

        switch (edge) {
            case "TOP":
                return {
                    alignmentBaseline: "auto",
                    textAnchor: preferredHorizontalSide === "RIGHT" ? "start" : "end",
                    offset: {
                        dx:
                            preferredHorizontalSide === "RIGHT"
                                ? deltaAlongNormal
                                : -deltaAlongNormal,
                        dy: -deltaAlongEdge
                    }
                };

            case "LEFT":
                return {
                    alignmentBaseline: preferredVerticalSide === "TOP" ? "auto" : "hanging",
                    textAnchor: "end",
                    offset: {
                        dx: -deltaAlongEdge,
                        dy: preferredVerticalSide === "TOP" ? -deltaAlongNormal : deltaAlongNormal
                    }
                };

            case "RIGHT":
                return {
                    alignmentBaseline: preferredVerticalSide === "TOP" ? "auto" : "hanging",
                    textAnchor: "start",
                    offset: {
                        dx: deltaAlongEdge,
                        dy: preferredVerticalSide === "TOP" ? -deltaAlongNormal : deltaAlongNormal
                    }
                };

            case "BOTTOM":
                return {
                    alignmentBaseline: "hanging",
                    textAnchor: preferredHorizontalSide === "RIGHT" ? "start" : "end",
                    offset: {
                        dx:
                            preferredHorizontalSide === "RIGHT"
                                ? deltaAlongNormal
                                : -deltaAlongNormal,
                        dy: deltaAlongEdge
                    }
                };

            default:
                return assertNever(edge);
        }
    }
}

interface Props {
    relationship: Relationship;
    relationshipPath: Point[];
}
