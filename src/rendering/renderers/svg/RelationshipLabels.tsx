import * as React from "react";
import styled from "styled-components";
import { Delta, Point, RectEdge } from "../../../domain/geo";
import { assertNever } from "../../../domain/utils";
import CoordinateSystem from '../../../components/Canvas/CoordinateSystem';
import { Relationship } from '../../../services/Interface/ExternalState';
import { RelationshipEnd } from '../../layouters/relationship';

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

        let x = position.x + offset.dx;
        let y = position.y + offset.dy;

        if (this.props.coordinateSystem) {
            const screen = this.props.coordinateSystem.pointToScreen(position.x + offset.dx, position.y + offset.dy);
            x = screen.x;
            y = screen.y;
        }

        const isIE = /*@cc_on!@*/false || !!(document as any).documentMode;
        const isEdge = !isIE && !!(window as any).StyleMedia;
        let dy = 0;
        if (isIE || isEdge) dy = offset.dy;

        return (
            <Text x={x} y={y} dy={dy} textAnchor={textAnchor} dominantBaseline={alignmentBaseline}>
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

        let x = position.x + offset.dx;
        let y = position.y + offset.dy;

        if (this.props.coordinateSystem) {
            const screen = this.props.coordinateSystem.pointToScreen(position.x + offset.dx, position.y + offset.dy);
            x = screen.x;
            y = screen.y;
        }

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
    coordinateSystem?: CoordinateSystem;
}
