import React, { SFC } from 'react';
import { Direction, IUMLElementPort } from '../../../services/uml-element/uml-element-port';
import { Point } from '../../../utils/geometry/point';
import { ClassRelationshipType } from '../../uml-class-diagram';
import { UMLAssociation } from './uml-association';
import { UMLRelationshipType } from '../../uml-relationship-type';

const Marker = {
  Arrow: (id: string) => (
    <marker
      id={id}
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
  ),
  Rhombus: (id: string) => (
    <marker
      id={id}
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
  ),
  RhombusFilled: (id: string) => (
    <marker
      id={id}
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
  ),
  Triangle: (id: string) => (
    <marker
      id={id}
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
  ),
};

export const layoutTextForUMLAssociation = (location: IUMLElementPort['direction'], position: 'TOP' | 'BOTTOM') => {
  switch (location) {
    case Direction.Up:
      return {
        dx: position === 'TOP' ? -5 : 5,
        textAnchor: position === 'TOP' ? 'end' : 'start',
      };
    case Direction.Right:
      return {
        dy: position === 'TOP' ? -10 : 21,
        textAnchor: 'start',
      };
    case Direction.Down:
      return {
        dx: position === 'TOP' ? -5 : 5,
        dy: 10,
        textAnchor: position === 'TOP' ? 'end' : 'start',
      };
    case Direction.Left:
      return {
        dy: position === 'TOP' ? -10 : 21,
        textAnchor: 'end',
      };
  }
};

export const computeTextPositionForUMLAssociation = (alignmentPath: Point[], hasMarker: boolean = false): Point => {
  const distance = hasMarker ? 31 : 8;
  if (alignmentPath.length < 2) return new Point();
  const vector = alignmentPath[1].subtract(alignmentPath[0]);
  return alignmentPath[0].add(vector.normalize().scale(distance));
};

export const getMarkerForTypeForUMLAssociation = (relationshipType: UMLRelationshipType) => {
  return ((type) => {
    switch (type) {
      case ClassRelationshipType.ClassDependency:
      case ClassRelationshipType.ClassUnidirectional:
        return Marker.Arrow;
      case ClassRelationshipType.ClassAggregation:
        return Marker.Rhombus;
      case ClassRelationshipType.ClassComposition:
        return Marker.RhombusFilled;
      case ClassRelationshipType.ClassInheritance:
      case ClassRelationshipType.ClassRealization:
        return Marker.Triangle;
    }
  })(relationshipType);
};

export const UMLAssociationComponent: SFC<Props> = ({ element }) => {
  const marker = getMarkerForTypeForUMLAssociation(element.type);

  const stroke = ((type) => {
    switch (type) {
      case ClassRelationshipType.ClassDependency:
      case ClassRelationshipType.ClassRealization:
        return 7;
    }
  })(element.type);

  const path = element.path.map((point) => new Point(point.x, point.y));
  const source: Point = computeTextPositionForUMLAssociation(path);
  const target: Point = computeTextPositionForUMLAssociation(path.reverse(), !!marker);
  const id = `marker-${element.id}`;

  return (
    <g>
      {marker && marker(id)}
      <polyline
        points={element.path.map((point) => `${point.x} ${point.y}`).join(',')}
        stroke="black"
        fill="none"
        strokeWidth={1}
        markerEnd={`url(#${id})`}
        strokeDasharray={stroke}
      />
      <text
        x={source.x}
        y={source.y}
        {...layoutTextForUMLAssociation(element.source.direction, 'BOTTOM')}
        pointerEvents="none"
      >
        {element.source.multiplicity}
      </text>
      <text
        x={target.x}
        y={target.y}
        {...layoutTextForUMLAssociation(element.target.direction, 'BOTTOM')}
        pointerEvents="none"
      >
        {element.target.multiplicity}
      </text>
      <text
        x={source.x}
        y={source.y}
        {...layoutTextForUMLAssociation(element.source.direction, 'TOP')}
        pointerEvents="none"
      >
        {element.source.role}
      </text>
      <text
        x={target.x}
        y={target.y}
        {...layoutTextForUMLAssociation(element.target.direction, 'TOP')}
        pointerEvents="none"
      >
        {element.target.role}
      </text>
    </g>
  );
};

interface Props {
  element: UMLAssociation;
}
