import * as React from 'react';
import styled from 'styled-components';
import Relationship, { RelationshipEnd } from '../../../domain/Relationship';
import { Delta, Point, RectEdge } from '../../../domain/geo';
import { assertNever } from '../../../domain/utils';
import CoordinateSystem from '../../../components/Canvas/CoordinateSystem';
import Port from '../../Port';

const Text = styled.text`
  user-select: none;
`;

export default class RelationshipLabels extends React.Component<Props> {
  render() {
    const { relationship, relationshipPath } = this.props;

    const sourcePoint = relationshipPath[0];
    const targetPoint = relationshipPath[relationshipPath.length - 1];

    const targetEndHasMarker = relationship.kind !== 'BidirectionalAssociation';

    return (
      <>
        {this.renderMultiplicity(relationship, 'source', sourcePoint, false)}
        {this.renderMultiplicity(
          relationship,
          'target',
          targetPoint,
          targetEndHasMarker
        )}

        {this.renderRole(relationship, 'source', sourcePoint, false)}
        {this.renderRole(
          relationship,
          'target',
          targetPoint,
          targetEndHasMarker
        )}
      </>
    );
  }

  renderMultiplicity(
    relationship: Relationship,
    end: 'source' | 'target',
    position: Point,
    hasMarker: boolean
  ) {
    const multiplicity: string = (relationship as any)[`${end}Multiplicity`];
    const port: Port = (relationship as any)[end];
    if (!multiplicity) return;

    const {
      alignmentBaseline,
      textAnchor,
      offset,
    } = RelationshipLabels.layoutText(
      port.location,
      hasMarker,
      'LEFT',
      'BOTTOM'
    );

    let x = position.x + offset.dx;
    let y = position.y + offset.dy;

    if (this.props.coordinateSystem) {
      const screen = this.props.coordinateSystem.pointToScreen(
        position.x + offset.dx,
        position.y + offset.dy
      );
      x = screen.x;
      y = screen.y;
    }

    const isIE = /*@cc_on!@*/ false || !!(document as any).documentMode;
    const isEdge = !isIE && !!(window as any).StyleMedia;
    let dy = 0;
    if (isIE || isEdge) dy = offset.dy;

    return (
      <Text
        x={x}
        y={y}
        dy={dy}
        textAnchor={textAnchor}
        dominantBaseline={alignmentBaseline}
      >
        {multiplicity}
      </Text>
    );
  }

  renderRole(
    relationship: Relationship,
    end: 'source' | 'target',
    position: Point,
    hasMarker: boolean
  ) {
    const role: string = (relationship as any)[`${end}Role`];
    const port: Port = (relationship as any)[end];
    if (!role) return;

    const {
      alignmentBaseline,
      textAnchor,
      offset,
    } = RelationshipLabels.layoutText(port.location, hasMarker, 'RIGHT', 'TOP');

    let x = position.x + offset.dx;
    let y = position.y + offset.dy;

    if (this.props.coordinateSystem) {
      const screen = this.props.coordinateSystem.pointToScreen(
        position.x + offset.dx,
        position.y + offset.dy
      );
      x = screen.x;
      y = screen.y;
    }

    return (
      <Text
        x={x}
        y={y}
        textAnchor={textAnchor}
        alignmentBaseline={alignmentBaseline}
      >
        {role}
      </Text>
    );
  }

  static layoutText(
    edge: Port['location'],
    leaveRoomForMarker: boolean,
    preferredHorizontalSide: 'LEFT' | 'RIGHT',
    preferredVerticalSide: 'TOP' | 'BOTTOM'
  ): {
    alignmentBaseline: 'auto' | 'hanging';
    textAnchor: 'start' | 'end';
    offset: Delta;
  } {
    const deltaAlongNormal = 8;
    const deltaAlongEdge = leaveRoomForMarker ? 31 : deltaAlongNormal;

    switch (edge) {
      case 'N':
        return {
          alignmentBaseline: 'auto',
          textAnchor: preferredHorizontalSide === 'RIGHT' ? 'start' : 'end',
          offset: {
            dx:
              preferredHorizontalSide === 'RIGHT'
                ? deltaAlongNormal
                : -deltaAlongNormal,
            dy: -deltaAlongEdge,
          },
        };

      case 'W':
        return {
          alignmentBaseline:
            preferredVerticalSide === 'TOP' ? 'auto' : 'hanging',
          textAnchor: 'end',
          offset: {
            dx: -deltaAlongEdge,
            dy:
              preferredVerticalSide === 'TOP'
                ? -deltaAlongNormal
                : deltaAlongNormal,
          },
        };

      case 'E':
        return {
          alignmentBaseline:
            preferredVerticalSide === 'TOP' ? 'auto' : 'hanging',
          textAnchor: 'start',
          offset: {
            dx: deltaAlongEdge,
            dy:
              preferredVerticalSide === 'TOP'
                ? -deltaAlongNormal
                : deltaAlongNormal,
          },
        };

      case 'S':
        return {
          alignmentBaseline: 'hanging',
          textAnchor: preferredHorizontalSide === 'RIGHT' ? 'start' : 'end',
          offset: {
            dx:
              preferredHorizontalSide === 'RIGHT'
                ? deltaAlongNormal
                : -deltaAlongNormal,
            dy: deltaAlongEdge,
          },
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
